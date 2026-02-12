import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { RequestList } from '../components/requests/RequestList';
import { RequestDetail } from '../components/requests/RequestDetail';
import { SideSheet } from '../components/ui/SideSheet';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { SearchInput } from '../components/ui/SearchInput';
import { SkeletonList } from '../components/ui/Skeleton';
import { FilterChips } from '../components/ui/FilterChips';
import { requests as requestsApi } from '../lib/api';

/**
 * MyRequests - User's personal request tracking page
 * Shows only requests submitted by the current user
 * Mirrors Dashboard's search/filter/sort UI
 */

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'backlog', label: 'Backlog' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'duplicate', label: 'Duplicate' },
];

const categoryOptions = [
  { value: '', label: 'All Categories' },
  { value: 'bug', label: 'Bug' },
  { value: 'new_feature', label: 'New Feature' },
  { value: 'optimization', label: 'Optimization' },
];

export function MyRequests() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'mine');

  // Initialize filters from URL params
  const [filters, setFilters] = useState({
    status: searchParams.get('status') || '',
    category: searchParams.get('category') || '',
    sort: searchParams.get('sort') || 'recency',
    search: searchParams.get('search') || '',
  });

  const [requestsList, setRequestsList] = useState([]);
  const [watchingList, setWatchingList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);

  // Track position changes for animations
  const [positionChanges, setPositionChanges] = useState({});
  const previousOrderRef = useRef([]);

  // Track items being archived for exit animation
  const [archivingIds, setArchivingIds] = useState(new Set());

  // Check if any filters are active
  const hasActiveFilters = filters.status || filters.category;
  const activeFilterCount = [filters.status, filters.category].filter(Boolean).length;

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (activeTab !== 'mine') params.set('tab', activeTab);
    if (filters.status) params.set('status', filters.status);
    if (filters.category) params.set('category', filters.category);
    if (filters.sort && filters.sort !== 'recency') params.set('sort', filters.sort);
    if (filters.search) params.set('search', filters.search);
    setSearchParams(params, { replace: true });
  }, [filters, activeTab, setSearchParams]);

  // Load requests from API
  useEffect(() => {
    if (activeTab === 'mine') loadRequests();
  }, [filters.status, filters.category, filters.search, activeTab]);

  // Load watching list
  useEffect(() => {
    if (activeTab === 'watching') loadWatching();
  }, [activeTab]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const params = { order: 'desc', myRequests: 'true' };
      if (filters.status) params.status = filters.status;
      if (filters.category) params.category = filters.category;
      if (filters.search) params.search = filters.search;

      const data = await requestsApi.getAll(params);
      setRequestsList(data);
      previousOrderRef.current = data.map(r => r.id);
    } catch (err) {
      console.error('Failed to load requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadWatching = async () => {
    setLoading(true);
    try {
      const data = await requestsApi.getWatching();
      setWatchingList(data);
    } catch (err) {
      console.error('Failed to load watching list:', err);
    } finally {
      setLoading(false);
    }
  };

  // Sort requests client-side for instant updates
  const sortedRequests = useMemo(() => {
    const sorted = [...requestsList];

    if (filters.sort === 'votes') {
      sorted.sort((a, b) => {
        const scoreA = (a.upvotes || 0) + (a.likes || 0);
        const scoreB = (b.upvotes || 0) + (b.likes || 0);
        return scoreB - scoreA;
      });
    } else {
      sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    return sorted;
  }, [requestsList, filters.sort]);

  // Toggle sort between recency and votes
  const toggleSort = () => {
    setFilters((prev) => ({
      ...prev,
      sort: prev.sort === 'recency' ? 'votes' : 'recency',
    }));
  };

  // Detect position changes when sorted order changes
  useEffect(() => {
    const currentOrder = sortedRequests.map(r => r.id);
    const changes = {};

    currentOrder.forEach((id, newIndex) => {
      const oldIndex = previousOrderRef.current.indexOf(id);
      if (oldIndex !== -1 && oldIndex !== newIndex) {
        if (newIndex < oldIndex) {
          changes[id] = 'up';
        } else if (newIndex > oldIndex) {
          changes[id] = 'down';
        }
      }
    });

    if (Object.keys(changes).length > 0) {
      setPositionChanges(changes);
      setTimeout(() => {
        setPositionChanges({});
      }, 2000);
    }

    previousOrderRef.current = currentOrder;
  }, [sortedRequests]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({ status: '', category: '', sort: 'recency', search: '' });
  };

  // Handle search from autocomplete
  const handleSearchSelect = (suggestion) => {
    handleRequestClick(suggestion);
  };

  // Handle real-time vote updates
  const handleVoteChange = useCallback((requestId, { upvotes, likes, userVotes }) => {
    setRequestsList((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? { ...r, upvotes, likes, userVotes }
          : r
      )
    );
  }, []);

  const handleRequestClick = (request) => {
    // Open immediately with card data, then load full details in background
    setSelectedRequest(request);
    requestsApi.getOne(request.id).then((fullRequest) => {
      setSelectedRequest(fullRequest);
    }).catch((err) => {
      console.error('Failed to load request details:', err);
    });
  };

  const handleStatusUpdate = (requestId, newStatus) => {
    if (newStatus === 'archived') {
      setArchivingIds((prev) => new Set([...prev, requestId]));
      setSelectedRequest(null);
      setTimeout(() => {
        setRequestsList((prev) => prev.filter((r) => r.id !== requestId));
        setArchivingIds((prev) => {
          const next = new Set(prev);
          next.delete(requestId);
          return next;
        });
      }, 300);
    } else {
      setRequestsList((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status: newStatus } : r))
      );
      if (selectedRequest?.id === requestId) {
        setSelectedRequest((prev) => ({ ...prev, status: newStatus }));
      }
    }
  };

  const handleDelete = (requestId) => {
    setRequestsList((prev) => prev.filter((r) => r.id !== requestId));
    setSelectedRequest(null);
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
              aria-label="Go back"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-lg font-semibold text-neutral-900 dark:text-[#E6EDF3] mb-1">My Requests</h1>
              <p className="text-sm text-neutral-500 dark:text-[#8B949E]">Track your submitted requests</p>
            </div>
          </div>
          <Link to="/new-request">
            <Button>New Request</Button>
          </Link>
        </div>

        {/* Tabs: Mine / Watching */}
        <div className="flex gap-1 p-1 bg-neutral-100 dark:bg-[#21262D] rounded-lg mb-4">
          <button
            onClick={() => setActiveTab('mine')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === 'mine'
                ? 'bg-white dark:bg-[#161B22] text-neutral-900 dark:text-[#E6EDF3] shadow-sm'
                : 'text-neutral-500 dark:text-[#8B949E] hover:text-neutral-700 dark:hover:text-neutral-300'
            }`}
          >
            My Requests
          </button>
          <button
            onClick={() => setActiveTab('watching')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'watching'
                ? 'bg-white dark:bg-[#161B22] text-neutral-900 dark:text-[#E6EDF3] shadow-sm'
                : 'text-neutral-500 dark:text-[#8B949E] hover:text-neutral-700 dark:hover:text-neutral-300'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
            Watching
          </button>
        </div>

        {activeTab === 'mine' && (
          <>
            {/* Search and Filter Row - only for Mine tab */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1">
                <SearchInput
                  value={filters.search}
                  onChange={(value) => handleFilterChange('search', value)}
                  onSelect={handleSearchSelect}
                  placeholder="Search by title or requester..."
                />
              </div>
              <button
                onClick={() => setShowFilters(true)}
                className={`
                  relative flex items-center justify-center w-11 h-11 rounded-lg border transition-all duration-200
                  ${hasActiveFilters
                    ? 'bg-[#4F46E5] dark:bg-[#6366F1] border-[#4F46E5] dark:border-[#6366F1] text-white'
                    : 'bg-white dark:bg-[#21262D] border-neutral-200 dark:border-[#30363D] text-neutral-600 dark:text-[#8B949E] hover:border-neutral-300 dark:hover:border-[#484F58] hover:bg-neutral-50 dark:hover:bg-[#2D333B]'
                  }
                `}
                title="Filters"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
                </svg>
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#4F46E5] dark:bg-[#6366F1] text-white text-xs font-medium rounded-full flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>

            {/* Active Filter Chips */}
            <FilterChips
              filters={filters}
              onRemove={(key) => handleFilterChange(key, '')}
              onClearAll={clearFilters}
            />

            {/* Request count and sort toggle */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-neutral-500 dark:text-[#8B949E]">
                {sortedRequests.length} request{sortedRequests.length !== 1 ? 's' : ''}
              </p>
              <button
                onClick={toggleSort}
                className="flex items-center gap-1.5 text-sm text-neutral-600 dark:text-[#8B949E] hover:text-neutral-900 dark:hover:text-[#E6EDF3] transition-colors"
                title={filters.sort === 'recency' ? 'Sorted by recent' : 'Sorted by votes'}
              >
                <span className="text-neutral-400 dark:text-[#6E7681]">
                  {filters.sort === 'recency' ? 'Recent' : 'Votes'}
                </span>
                <svg
                  className={`w-4 h-4 transition-transform duration-200 ${filters.sort === 'votes' ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            {/* Request List */}
            {loading ? (
              <SkeletonList count={3} />
            ) : (
              <RequestList
                requests={sortedRequests}
                onRequestClick={handleRequestClick}
                onVoteChange={handleVoteChange}
                positionChanges={positionChanges}
                exitingIds={archivingIds}
                emptyMessage="You haven't submitted any requests yet"
              />
            )}
          </>
        )}

        {activeTab === 'watching' && (
          <>
            {loading ? (
              <SkeletonList count={3} />
            ) : watchingList.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-12 h-12 mx-auto text-neutral-300 dark:text-neutral-600 mb-4" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
                <p className="text-neutral-500 dark:text-[#8B949E] text-sm mb-1">No watched requests</p>
                <p className="text-neutral-400 dark:text-[#6E7681] text-xs">
                  Watch requests to track their updates here
                </p>
              </div>
            ) : (
              <RequestList
                requests={watchingList}
                onRequestClick={handleRequestClick}
                onVoteChange={handleVoteChange}
                emptyMessage="No watched requests"
              />
            )}
          </>
        )}

        {/* Filter Side Sheet */}
        <SideSheet
          isOpen={showFilters}
          onClose={() => setShowFilters(false)}
          title="Filters"
        >
          <div className="space-y-5">
            <Select
              label="Status"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              options={statusOptions}
            />
            <Select
              label="Category"
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              options={categoryOptions}
            />

            {/* Actions */}
            <div className="pt-4 border-t border-neutral-100 dark:border-[#30363D] space-y-3">
              <Button
                onClick={() => setShowFilters(false)}
                className="w-full"
              >
                Apply Filters
              </Button>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="w-full text-sm text-neutral-500 dark:text-[#8B949E] hover:text-neutral-900 dark:hover:text-[#E6EDF3] transition-colors py-2"
                >
                  Clear all filters
                </button>
              )}
            </div>
          </div>
        </SideSheet>

        {/* Request Detail Modal */}
        <RequestDetail
          request={selectedRequest}
          isOpen={!!selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onStatusUpdate={handleStatusUpdate}
          onDelete={handleDelete}
        />
      </div>
    </Layout>
  );
}
