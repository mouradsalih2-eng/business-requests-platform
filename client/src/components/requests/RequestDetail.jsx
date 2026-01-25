import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../ui/Modal';
import { StatusBadge, CategoryBadge, PriorityBadge, TeamBadge, RegionBadge } from '../ui/Badge';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { VoteButtons } from '../social/VoteButtons';
import { CommentSection } from '../social/CommentSection';
import { useAuth } from '../../context/AuthContext';
import { requests as requestsApi } from '../../lib/api';

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
  const [status, setStatus] = useState(request?.status || '');
  const [updating, setUpdating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activityLog, setActivityLog] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  // Sync status when request changes
  useEffect(() => {
    if (request) {
      setStatus(request.status);
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

  // Reset delete confirm when modal closes
  useEffect(() => {
    if (!isOpen) {
      setShowDeleteConfirm(false);
    }
  }, [isOpen]);

  if (!request) return null;

  // Handle status change - update without navigation (let parent handle any transitions)
  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
    setStatus(newStatus);
    setUpdating(true);

    try {
      await requestsApi.update(request.id, { status: newStatus });
      onStatusUpdate?.(request.id, newStatus);

      // Only close modal for archived status (parent will handle the exit animation)
      // For other statuses, keep the modal open so user can see the update
      if (newStatus === 'archived') {
        onClose();
      }
    } catch (err) {
      console.error('Failed to update status:', err);
      setStatus(request.status); // Revert on error
    } finally {
      setUpdating(false);
    }
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
              Submitted by <span className="text-neutral-900 dark:text-neutral-100">{request.author_name}</span>
            </p>
            <p className="text-sm text-neutral-400 dark:text-neutral-500">{formattedDate}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <CategoryBadge category={request.category} />
            <PriorityBadge priority={request.priority} />
            {request.team && <TeamBadge team={request.team} />}
            {request.region && <RegionBadge region={request.region} />}
          </div>
        </div>

        {/* Status and Votes - stack on mobile */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
          <div className="flex items-center gap-3">
            <span className="text-sm text-neutral-500 dark:text-neutral-400">Status</span>
            {isAdmin ? (
              <Select
                value={status}
                onChange={handleStatusChange}
                options={statusOptions}
                className="w-full sm:w-36"
                disabled={updating}
              />
            ) : (
              <StatusBadge status={request.status} />
            )}
          </div>
          <VoteButtons
            requestId={request.id}
            initialUpvotes={request.upvotes}
            initialLikes={request.likes}
            initialUserVotes={request.userVotes || []}
          />
        </div>

        {/* Business Context */}
        <div className="space-y-4">
          {request.business_problem && (
            <div>
              <h4 className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-1.5">
                Business Problem
              </h4>
              <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                {request.business_problem}
              </p>
            </div>
          )}
          {request.problem_size && (
            <div>
              <h4 className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-1.5">
                Problem Size
              </h4>
              <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                {request.problem_size}
              </p>
            </div>
          )}
          {request.business_expectations && (
            <div>
              <h4 className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-1.5">
                Business Expectations
              </h4>
              <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                {request.business_expectations}
              </p>
            </div>
          )}
          {request.expected_impact && (
            <div>
              <h4 className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-1.5">
                Expected Impact
              </h4>
              <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                {request.expected_impact}
              </p>
            </div>
          )}
        </div>

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
                  href={`/api/uploads/${attachment.filepath}`}
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
