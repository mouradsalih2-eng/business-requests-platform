import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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
import { useAuth } from '../context/AuthContext';
import { useProject } from '../context/ProjectContext';

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
  const { isAdmin, isSuperAdmin } = useAuth();
  const { currentProject, loading: projectLoading } = useProject();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);

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

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    if (filters.category) params.set('category', filters.category);
    if (filters.sort && filters.sort !== 'recency') params.set('sort', filters.sort);
    if (filters.search) params.set('search', filters.search);
    setSearchParams(params, { replace: true });
  }, [filters, setSearchParams]);

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

  // No project state — early returns placed after all hooks
  if (!projectLoading && !currentProject) {
    if (isSuperAdmin) {
      return (
        <Layout>
          <div className="max-w-4xl mx-auto flex items-center justify-center min-h-[60vh]">
            <div className="text-center px-6 py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-[#E6EDF3] mb-2">You're in Platform Mode</h2>
              <p className="text-sm text-neutral-500 dark:text-[#8B949E] max-w-sm mx-auto mb-6">
                As a super admin, manage all projects and users from the platform dashboard.
              </p>
              <Link to="/super-admin" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-xl text-sm font-medium transition-colors">
                Go to Platform Dashboard
              </Link>
            </div>
          </div>
        </Layout>
      );
    }
    if (isAdmin) {
      return (
        <Layout>
          <div className="max-w-4xl mx-auto flex items-center justify-center min-h-[60vh]">
            <div className="text-center px-6 py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#4F46E5]/10 dark:bg-[#6366F1]/15 flex items-center justify-center">
                <svg className="w-8 h-8 text-[#4F46E5] dark:text-[#818CF8]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-[#E6EDF3] mb-2">Set Up Your First Project</h2>
              <p className="text-sm text-neutral-500 dark:text-[#8B949E] max-w-sm mx-auto mb-6">
                Create a project to start collecting and managing requests from your team.
              </p>
              <Link to="/onboarding" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-xl text-sm font-medium transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Create Project
              </Link>
            </div>
          </div>
        </Layout>
      );
    }
    return (
      <Layout>
        <div className="max-w-4xl mx-auto flex items-center justify-center min-h-[60vh]">
          <div className="text-center px-6 py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-100 dark:bg-[#21262D] flex items-center justify-center">
              <svg className="w-8 h-8 text-neutral-400 dark:text-[#484F58]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-[#E6EDF3] mb-2">No Project Assigned</h2>
            <p className="text-sm text-neutral-500 dark:text-[#8B949E] max-w-sm mx-auto">
              You haven't been added to any project yet. Contact your administrator to get access.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-lg font-semibold text-neutral-900 dark:text-[#E6EDF3] mb-1">All Requests</h1>
            <p className="text-sm text-neutral-500 dark:text-[#8B949E]">
              {isAdmin ? 'View and manage all requests' : 'Browse and vote on requests'}
            </p>
          </div>

          <Link to="/new-request">
            <Button>New Request</Button>
          </Link>
        </div>
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
      </div>
    </Layout>
  );
}
