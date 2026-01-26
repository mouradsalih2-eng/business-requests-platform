import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { RequestList } from '../components/requests/RequestList';
import { RequestDetail } from '../components/requests/RequestDetail';
import { KanbanBoard } from '../components/roadmap/KanbanBoard';
import { SideSheet } from '../components/ui/SideSheet';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { SearchInput } from '../components/ui/SearchInput';
import { SkeletonList } from '../components/ui/Skeleton';
import { FilterChips } from '../components/ui/FilterChips';
import { requests as requestsApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';

/**
 * Dashboard - Main view for browsing all requests
 * Supports filtering, sorting, URL persistence, and real-time vote updates
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


export function Dashboard() {
  const { isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);

  // Tab state: 'requests' or 'roadmap'
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'requests');

  // Initialize filters from URL params
  const [filters, setFilters] = useState({
    status: searchParams.get('status') || '',
    category: searchParams.get('category') || '',
    sort: searchParams.get('sort') || 'recency',
    search: searchParams.get('search') || '',
  });

  const [requestsList, setRequestsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);

  // Track position changes for animations
  const [positionChanges, setPositionChanges] = useState({});
  const previousOrderRef = useRef([]);

  // Track items being archived for exit animation
  const [archivingIds, setArchivingIds] = useState(new Set());

  // Check if any filters are active (excluding search which is separate)
  const hasActiveFilters = filters.status || filters.category;
  const activeFilterCount = [filters.status, filters.category].filter(Boolean).length;

  // Sync filters and tab to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (activeTab !== 'requests') params.set('tab', activeTab);
    if (filters.status) params.set('status', filters.status);
    if (filters.category) params.set('category', filters.category);
    if (filters.sort && filters.sort !== 'recency') params.set('sort', filters.sort);
    if (filters.search) params.set('search', filters.search);
    setSearchParams(params, { replace: true });
  }, [filters, activeTab, setSearchParams]);

  // Load requests from API
  useEffect(() => {
    loadRequests();
  }, [filters.status, filters.category, filters.search]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const params = { order: 'desc' };
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

  // Sort requests client-side for instant updates
  const sortedRequests = useMemo(() => {
    const sorted = [...requestsList];

    if (filters.sort === 'votes') {
      // Sort by total votes (upvotes + likes)
      sorted.sort((a, b) => {
        const scoreA = (a.upvotes || 0) + (a.likes || 0);
        const scoreB = (b.upvotes || 0) + (b.likes || 0);
        return scoreB - scoreA;
      });
    } else {
      // Default: sort by recency
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
      // Clear position indicators after animation
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
    // Open the selected request directly
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

  const handleRequestClick = async (request) => {
    try {
      const fullRequest = await requestsApi.getOne(request.id);
      setSelectedRequest(fullRequest);
    } catch (err) {
      console.error('Failed to load request:', err);
    }
  };

  const handleStatusUpdate = (requestId, newStatus) => {
    // If archiving, animate out then remove from list
    if (newStatus === 'archived') {
      // Start exit animation
      setArchivingIds((prev) => new Set([...prev, requestId]));

      // Close the modal
      setSelectedRequest(null);

      // Remove from list after animation completes
      setTimeout(() => {
        setRequestsList((prev) => prev.filter((r) => r.id !== requestId));
        setArchivingIds((prev) => {
          const next = new Set(prev);
          next.delete(requestId);
          return next;
        });
      }, 300); // Match animation duration
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
        {/* Header with Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            {/* Tabs */}
            <div className="flex items-center gap-1 mb-2">
              <button
                onClick={() => setActiveTab('requests')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  activeTab === 'requests'
                    ? 'bg-[#4F46E5]/10 dark:bg-[#6366F1]/15 text-[#4F46E5] dark:text-[#818CF8]'
                    : 'text-neutral-600 dark:text-[#8B949E] hover:text-neutral-900 dark:hover:text-[#E6EDF3] hover:bg-neutral-100 dark:hover:bg-[#21262D]'
                }`}
              >
                Requests
              </button>
              <button
                onClick={() => setActiveTab('roadmap')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  activeTab === 'roadmap'
                    ? 'bg-[#4F46E5]/10 dark:bg-[#6366F1]/15 text-[#4F46E5] dark:text-[#818CF8]'
                    : 'text-neutral-600 dark:text-[#8B949E] hover:text-neutral-900 dark:hover:text-[#E6EDF3] hover:bg-neutral-100 dark:hover:bg-[#21262D]'
                }`}
              >
                Roadmap
              </button>
            </div>
            <p className="text-sm text-neutral-500 dark:text-[#8B949E]">
              {activeTab === 'requests'
                ? (isAdmin ? 'View and manage all requests' : 'Browse and vote on requests')
                : 'Track feature progress across development stages'}
            </p>
          </div>

          {/* New Request CTA */}
          {activeTab === 'requests' && (
            <Link to="/new-request">
              <Button>New Request</Button>
            </Link>
          )}
        </div>

        {/* Requests Tab Content */}
        {activeTab === 'requests' && (
          <>
            {/* Search and Filter Row */}
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
          {/* Sort toggle */}
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
          <SkeletonList count={4} />
        ) : (
          <RequestList
            requests={sortedRequests}
            onRequestClick={handleRequestClick}
            onVoteChange={handleVoteChange}
            positionChanges={positionChanges}
            exitingIds={archivingIds}
            emptyMessage="No requests found"
          />
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
          </>
        )}

        {/* Roadmap Tab Content */}
        {activeTab === 'roadmap' && (
          <div className="mt-2">
            <KanbanBoard />
          </div>
        )}
      </div>
    </Layout>
  );
}
