import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Modal } from '../ui/Modal';
import { StatusBadge, CategoryBadge, PriorityBadge, TeamBadge, RegionBadge } from '../ui/Badge';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { VoteButtons } from '../social/VoteButtons';
import { CommentSection } from '../social/CommentSection';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../ui/Toast';
import { useFeatureFlag } from '../../context/FeatureFlagContext';
import { requests as requestsApi } from '../../lib/api';
import { useFieldVisibility } from '../../hooks/useFieldVisibility';

function formatCustomFieldValue(cv) {
  if (cv.value === null || cv.value === undefined) return '';
  if (cv.field_type === 'checkbox') return cv.value ? 'Yes' : 'No';
  if (cv.field_type === 'rating') return `${'★'.repeat(Number(cv.value))}${'☆'.repeat(Math.max(0, 5 - Number(cv.value)))}`;
  if (cv.field_type === 'multi_select' && Array.isArray(cv.value)) return cv.value.join(', ');
  if (cv.field_type === 'date') {
    try { return new Date(cv.value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); }
    catch { return String(cv.value); }
  }
  return String(cv.value);
}

/**
 * RequestDetail modal - Mobile-first responsive design
 * Full screen on mobile, modal on desktop
 * Admin can update status and delete requests
 */

const statusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'backlog', label: 'Backlog' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'duplicate', label: 'Duplicate' },
  { value: 'archived', label: 'Archived' },
];

export function RequestDetail({ request, isOpen, onClose, onStatusUpdate, onDelete }) {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const mergingEnabled = useFeatureFlag('request_merging');
  const { isFieldVisible } = useFieldVisibility();
  const [status, setStatus] = useState(request?.status || '');
  const [updating, setUpdating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activityLog, setActivityLog] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [isWatching, setIsWatching] = useState(false);
  const [watcherCount, setWatcherCount] = useState(0);
  const [togglingWatch, setTogglingWatch] = useState(false);

  // Merge state
  const [showMergeUI, setShowMergeUI] = useState(false);
  const [mergeSearch, setMergeSearch] = useState('');
  const [mergeSearchResults, setMergeSearchResults] = useState([]);
  const [selectedMergeTarget, setSelectedMergeTarget] = useState(null);
  const [mergeOptions, setMergeOptions] = useState({ mergeVotes: true, mergeComments: false });
  const [merging, setMerging] = useState(false);
  const [searchingMerge, setSearchingMerge] = useState(false);

  // Sync status and watch state when request changes
  useEffect(() => {
    if (request) {
      setStatus(request.status);
      setIsWatching(request.isWatching || false);
      setWatcherCount(request.watcherCount || 0);
    }
  }, [request]);

  // Fetch activity log when request changes
  useEffect(() => {
    if (request && isOpen) {
      setLoadingActivity(true);
      requestsApi.getActivity(request.id)
        .then(setActivityLog)
        .catch((err) => console.error('Failed to load activity log:', err))
        .finally(() => setLoadingActivity(false));
    }
  }, [request, isOpen]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setShowDeleteConfirm(false);
      setShowMergeUI(false);
      setMergeSearch('');
      setMergeSearchResults([]);
      setSelectedMergeTarget(null);
      setMergeOptions({ mergeVotes: true, mergeComments: false });
    }
  }, [isOpen]);

  // Search for merge targets
  useEffect(() => {
    if (!mergeSearch || mergeSearch.length < 2) {
      setMergeSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingMerge(true);
      try {
        const results = await requestsApi.search(mergeSearch, 10);
        // Filter out current request
        setMergeSearchResults(results.filter(r => r.id !== request?.id));
      } catch (err) {
        console.error('Failed to search requests:', err);
      } finally {
        setSearchingMerge(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [mergeSearch, request?.id]);

  if (!request) return null;

  // Handle status change - update without navigation (let parent handle any transitions)
  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
    setStatus(newStatus);

    // Show merge UI when changing to duplicate
    if (newStatus === 'duplicate') {
      setShowMergeUI(true);
      return; // Don't update status yet - wait for merge
    }

    setUpdating(true);

    try {
      await requestsApi.update(request.id, { status: newStatus });
      onStatusUpdate?.(request.id, newStatus);
      toast.success('Status updated');

      // Only close modal for archived status (parent will handle the exit animation)
      // For other statuses, keep the modal open so user can see the update
      if (newStatus === 'archived') {
        onClose();
      }
    } catch (err) {
      console.error('Failed to update status:', err);
      toast.error('Failed to update status');
      setStatus(request.status); // Revert on error
    } finally {
      setUpdating(false);
    }
  };

  // Handle merge
  const handleMerge = async () => {
    if (!selectedMergeTarget) {
      toast.error('Please select a request to merge into');
      return;
    }

    setMerging(true);
    try {
      await requestsApi.merge(request.id, selectedMergeTarget.id, mergeOptions);
      toast.success(`Merged into request #${selectedMergeTarget.id}`);
      onStatusUpdate?.(request.id, 'duplicate');
      onClose();
    } catch (err) {
      console.error('Failed to merge:', err);
      toast.error(err.message || 'Failed to merge request');
      setStatus(request.status); // Revert status
    } finally {
      setMerging(false);
    }
  };

  // Cancel merge - revert status
  const handleCancelMerge = () => {
    setShowMergeUI(false);
    setStatus(request.status);
    setMergeSearch('');
    setMergeSearchResults([]);
    setSelectedMergeTarget(null);
  };

  // Handle delete request
  const handleDelete = async () => {
    setDeleting(true);
    try {
      await requestsApi.delete(request.id);
      onDelete?.(request.id);
      onClose();
      navigate('/dashboard');
    } catch (err) {
      console.error('Failed to delete request:', err);
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleToggleWatch = async () => {
    if (togglingWatch) return;
    setTogglingWatch(true);
    try {
      const result = isWatching
        ? await requestsApi.unwatch(request.id)
        : await requestsApi.watch(request.id);
      setIsWatching(result.isWatching);
      setWatcherCount(result.watcherCount);
    } catch (err) {
      console.error('Failed to toggle watch:', err);
    } finally {
      setTogglingWatch(false);
    }
  };

  // Format date
  const formattedDate = new Date(request.created_at).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={request.title} size="lg">
      <div className="space-y-5 sm:space-y-6">
        {/* Header: Author, Date, Badges - stack on mobile */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {request.posted_by_admin_id ? (
                <>
                  Submitted by{' '}
                  <span className="text-neutral-900 dark:text-neutral-100">{request.posted_by_admin_name}</span>
                  {' '}on behalf of{' '}
                  <span className="text-neutral-900 dark:text-neutral-100">
                    {request.on_behalf_of_name || request.author_name}
                  </span>
                </>
              ) : (
                <>
                  Submitted by <span className="text-neutral-900 dark:text-neutral-100">{request.author_name}</span>
                </>
              )}
            </p>
            <p className="text-sm text-neutral-400 dark:text-neutral-500">{formattedDate}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <CategoryBadge category={request.category} />
            <PriorityBadge priority={request.priority} />
            {isFieldVisible('team') && request.team && <TeamBadge team={request.team} />}
            {isFieldVisible('region') && request.region && <RegionBadge region={request.region} />}
          </div>
        </div>

        {/* Status, Votes, and Watch - stack on mobile */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
          <div className="flex items-center gap-3">
            <span className="text-sm text-neutral-500 dark:text-neutral-400">Status</span>
            {isAdmin ? (
              <Select
                value={status}
                onChange={handleStatusChange}
                options={mergingEnabled ? statusOptions : statusOptions.filter(opt => opt.value !== 'duplicate')}
                className="w-full sm:w-36"
                disabled={updating}
              />
            ) : (
              <StatusBadge status={request.status} />
            )}
          </div>
          <div className="flex items-center gap-3">
            <VoteButtons
              requestId={request.id}
              initialUpvotes={request.upvotes}
              initialLikes={request.likes}
              initialUserVotes={request.userVotes || []}
            />
            <button
              onClick={handleToggleWatch}
              disabled={togglingWatch}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm transition-all duration-200 ${
                isWatching
                  ? 'bg-[#4F46E5]/10 dark:bg-[#6366F1]/20 text-[#4F46E5] dark:text-[#818CF8] border border-[#4F46E5]/30 dark:border-[#6366F1]/30'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-transparent'
              } ${togglingWatch ? 'opacity-50' : ''}`}
              title={isWatching ? 'Stop watching' : 'Watch this request'}
            >
              {isWatching ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M5.85 3.5a.75.75 0 00-1.117-1 9.719 9.719 0 00-2.348 4.876.75.75 0 001.479.248A8.219 8.219 0 015.85 3.5zM19.267 2.5a.75.75 0 10-1.118 1 8.22 8.22 0 011.987 4.124.75.75 0 001.48-.248A9.72 9.72 0 0019.266 2.5zM12 2.5A7.25 7.25 0 004.75 9.75c0 2.123-.8 4.057-2.122 5.52a.75.75 0 00.573 1.23h17.598a.75.75 0 00.573-1.23A7.722 7.722 0 0119.25 9.75 7.25 7.25 0 0012 2.5zM9.5 20.5a.75.75 0 00-.75.75c0 1.38 1.455 2.25 3.25 2.25s3.25-.87 3.25-2.25a.75.75 0 00-.75-.75h-5z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
              )}
              <span className="hidden sm:inline text-xs">{isWatching ? 'Watching' : 'Watch'}</span>
              {watcherCount > 0 && (
                <span className="text-xs opacity-70">{watcherCount}</span>
              )}
            </button>
          </div>
        </div>

        {/* Merged Into Indicator */}
        {request.merged_into_id && (
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
              </svg>
              <span className="text-sm">
                This request was merged into{' '}
                <Link
                  to={`/requests/${request.merged_into_id}`}
                  className="font-medium underline hover:no-underline"
                  onClick={onClose}
                >
                  Request #{request.merged_into_id}
                </Link>
              </span>
            </div>
          </div>
        )}

        {/* Merge UI - shown when admin changes status to duplicate */}
        {showMergeUI && isAdmin && mergingEnabled && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg space-y-4">
            <div>
              <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                Merge into another request
              </h4>
              <p className="text-xs text-blue-600 dark:text-blue-300 mb-3">
                Search for the original request to merge this duplicate into.
              </p>
              <Input
                placeholder="Search by title..."
                value={mergeSearch}
                onChange={(e) => setMergeSearch(e.target.value)}
                className="mb-2"
              />
              {/* Search Results */}
              {mergeSearchResults.length > 0 && (
                <div className="max-h-40 overflow-y-auto border border-blue-200 dark:border-blue-700 rounded-lg bg-white dark:bg-neutral-800">
                  {mergeSearchResults.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => {
                        setSelectedMergeTarget(result);
                        setMergeSearch('');
                        setMergeSearchResults([]);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 border-b border-blue-100 dark:border-blue-800 last:border-b-0"
                    >
                      <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                        #{result.id} - {result.title}
                      </div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400">
                        {result.author_name} • {result.status}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {searchingMerge && (
                <p className="text-xs text-blue-600 dark:text-blue-300">Searching...</p>
              )}
            </div>

            {/* Selected Target */}
            {selectedMergeTarget && (
              <div className="p-3 bg-white dark:bg-neutral-800 border border-blue-200 dark:border-blue-700 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Merge into:</p>
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      #{selectedMergeTarget.id} - {selectedMergeTarget.title}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedMergeTarget(null)}
                    className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Merge Options */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-200">
                <input
                  type="checkbox"
                  checked={mergeOptions.mergeVotes}
                  onChange={(e) => setMergeOptions(prev => ({ ...prev, mergeVotes: e.target.checked }))}
                  className="rounded border-blue-300 dark:border-blue-600 text-blue-600 focus:ring-blue-500"
                />
                Transfer votes to target request
              </label>
              <label className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-200">
                <input
                  type="checkbox"
                  checked={mergeOptions.mergeComments}
                  onChange={(e) => setMergeOptions(prev => ({ ...prev, mergeComments: e.target.checked }))}
                  className="rounded border-blue-300 dark:border-blue-600 text-blue-600 focus:ring-blue-500"
                />
                Transfer comments to target request
              </label>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                onClick={handleMerge}
                disabled={!selectedMergeTarget || merging}
                size="sm"
              >
                {merging ? 'Merging...' : 'Merge Request'}
              </Button>
              <Button
                onClick={handleCancelMerge}
                variant="secondary"
                size="sm"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Business Context */}
        <div className="space-y-4">
          {request.business_problem && (isFieldVisible('business_problem') || isAdmin) && (
            <div className={!isFieldVisible('business_problem') ? 'opacity-40' : ''}>
              <h4 className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-1.5">
                Business Problem
                {!isFieldVisible('business_problem') && isAdmin && (
                  <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 normal-case tracking-normal">hidden</span>
                )}
              </h4>
              <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                {request.business_problem}
              </p>
            </div>
          )}
          {request.problem_size && (isFieldVisible('problem_size') || isAdmin) && (
            <div className={!isFieldVisible('problem_size') ? 'opacity-40' : ''}>
              <h4 className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-1.5">
                Problem Size
                {!isFieldVisible('problem_size') && isAdmin && (
                  <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 normal-case tracking-normal">hidden</span>
                )}
              </h4>
              <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                {request.problem_size}
              </p>
            </div>
          )}
          {request.business_expectations && (isFieldVisible('business_expectations') || isAdmin) && (
            <div className={!isFieldVisible('business_expectations') ? 'opacity-40' : ''}>
              <h4 className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-1.5">
                Business Expectations
                {!isFieldVisible('business_expectations') && isAdmin && (
                  <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 normal-case tracking-normal">hidden</span>
                )}
              </h4>
              <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                {request.business_expectations}
              </p>
            </div>
          )}
          {request.expected_impact && (isFieldVisible('expected_impact') || isAdmin) && (
            <div className={!isFieldVisible('expected_impact') ? 'opacity-40' : ''}>
              <h4 className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-1.5">
                Expected Impact
                {!isFieldVisible('expected_impact') && isAdmin && (
                  <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 normal-case tracking-normal">hidden</span>
                )}
              </h4>
              <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                {request.expected_impact}
              </p>
            </div>
          )}
        </div>

        {/* Custom Field Values */}
        {request.customFieldValues?.length > 0 && (
          <div className="space-y-4">
            {request.customFieldValues
              .filter(cv => {
                const visible = isFieldVisible(`custom_${cv.field_id}`);
                // Regular users only see enabled fields; admins see all
                return visible || isAdmin;
              })
              .map(cv => {
                const visible = isFieldVisible(`custom_${cv.field_id}`);
                const displayValue = formatCustomFieldValue(cv);
                if (!displayValue && !isAdmin) return null;
                return (
                  <div key={cv.field_id} className={!visible ? 'opacity-40' : ''}>
                    <h4 className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-1.5">
                      {cv.field_label}
                      {!visible && isAdmin && (
                        <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 normal-case tracking-normal">hidden</span>
                      )}
                    </h4>
                    <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                      {displayValue || <span className="italic text-neutral-400">No value</span>}
                    </p>
                  </div>
                );
              })}
          </div>
        )}

        {/* Attachments */}
        {request.attachments?.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-2">
              Attachments
            </h4>
            <div className="space-y-2">
              {request.attachments.map((attachment) => (
                <a
                  key={attachment.id}
                  href={attachment.filepath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2 bg-neutral-50 dark:bg-neutral-800 rounded-lg text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                >
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  <span className="truncate">{attachment.filename}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Comments */}
        <div className="pt-4 border-t border-neutral-100 dark:border-neutral-700">
          <CommentSection requestId={request.id} />
        </div>

        {/* Activity Log */}
        {activityLog.length > 0 && (
          <div className="pt-4 border-t border-neutral-100 dark:border-neutral-700">
            <h4 className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-3">
              Activity Log
            </h4>
            <div className="space-y-2">
              {activityLog.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 text-sm">
                  <div className="w-6 h-6 rounded-full bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-neutral-700 dark:text-neutral-300">
                      <span className="font-medium">{activity.user_name}</span>
                      {activity.action === 'status_change' && (
                        <>
                          {' '}changed status from{' '}
                          <span className="font-medium text-neutral-500 dark:text-neutral-400">{activity.old_value}</span>
                          {' '}to{' '}
                          <span className="font-medium text-neutral-900 dark:text-neutral-100">{activity.new_value}</span>
                        </>
                      )}
                      {activity.action === 'merge' && (
                        <>
                          {' '}{activity.new_value}
                        </>
                      )}
                      {activity.action === 'merge_received' && (
                        <>
                          {' '}{activity.new_value}
                        </>
                      )}
                    </p>
                    <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
                      {new Date(activity.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Admin Delete Section */}
        {isAdmin && (
          <div className="pt-4 border-t border-neutral-100 dark:border-neutral-700">
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete this request
              </button>
            ) : (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-800 dark:text-red-200 mb-3">
                  Are you sure you want to delete this request? This action cannot be undone.
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={handleDelete}
                    disabled={deleting}
                    variant="danger"
                    size="sm"
                  >
                    {deleting ? 'Deleting...' : 'Yes, delete'}
                  </Button>
                  <Button
                    onClick={() => setShowDeleteConfirm(false)}
                    variant="secondary"
                    size="sm"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
