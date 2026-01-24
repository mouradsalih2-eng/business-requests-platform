import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { RequestList } from '../components/requests/RequestList';
import { RequestDetail } from '../components/requests/RequestDetail';
import { Button } from '../components/ui/Button';
import { SearchInput } from '../components/ui/SearchInput';
import { SkeletonList } from '../components/ui/Skeleton';
import { requests as requestsApi } from '../lib/api';

/**
 * MyRequests - User's personal request tracking page
 * Shows only requests submitted by the current user
 */

export function MyRequests() {
  const [requestsList, setRequestsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadRequests();
  }, [statusFilter, searchQuery]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      // Use myRequests=true to only get current user's requests
      const params = { order: 'desc', myRequests: 'true' };
      if (statusFilter) params.status = statusFilter;
      if (searchQuery) params.search = searchQuery;
      const data = await requestsApi.getAll(params);
      setRequestsList(data);
    } catch (err) {
      console.error('Failed to load requests:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle search from autocomplete
  const handleSearchSelect = (suggestion) => {
    handleRequestClick(suggestion);
  };

  const handleRequestClick = async (request) => {
    try {
      const fullRequest = await requestsApi.getOne(request.id);
      setSelectedRequest(fullRequest);
    } catch (err) {
      console.error('Failed to load request:', err);
    }
  };

  // Handle real-time vote updates
  const handleVoteChange = useCallback((requestId, { upvotes, likes }) => {
    setRequestsList((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? { ...r, upvotes, likes }
          : r
      )
    );
  }, []);

  const handleDelete = (requestId) => {
    setRequestsList((prev) => prev.filter((r) => r.id !== requestId));
    setSelectedRequest(null);
  };

  // Group requests by status for summary
  const statusCounts = requestsList.reduce((acc, req) => {
    acc[req.status] = (acc[req.status] || 0) + 1;
    return acc;
  }, {});

  // Status config
  const statusConfig = [
    { key: 'pending', label: 'Pending' },
    { key: 'backlog', label: 'Backlog' },
    { key: 'in_progress', label: 'Active' },
    { key: 'completed', label: 'Done' },
    { key: 'rejected', label: 'Rejected' },
    { key: 'duplicate', label: 'Duplicate' },
  ];

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">My Requests</h1>
            <p className="text-neutral-500 mt-1">Track your submitted requests</p>
          </div>
          <Link to="/new-request">
            <Button>New Request</Button>
          </Link>
        </div>

        {/* Search */}
        <div className="mb-6">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            onSelect={handleSearchSelect}
            placeholder="Search your requests..."
          />
        </div>

        {/* Status Summary - Monochrome pills */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setStatusFilter('')}
            className={`
              px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
              ${statusFilter === ''
                ? 'bg-neutral-900 text-white'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }
            `}
          >
            All ({requestsList.length})
          </button>
          {statusConfig.map(({ key, label }) => {
            const count = statusCounts[key] || 0;
            if (count === 0 && statusFilter !== key) return null;
            return (
              <button
                key={key}
                onClick={() => setStatusFilter(statusFilter === key ? '' : key)}
                className={`
                  px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
                  ${statusFilter === key
                    ? 'bg-neutral-900 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }
                `}
              >
                {label} ({count})
              </button>
            );
          })}
        </div>

        {/* Request List */}
        {loading ? (
          <SkeletonList count={3} />
        ) : (
          <RequestList
            requests={requestsList}
            onRequestClick={handleRequestClick}
            onVoteChange={handleVoteChange}
            emptyMessage="You haven't submitted any requests yet"
          />
        )}

        {/* Request Detail Modal */}
        <RequestDetail
          request={selectedRequest}
          isOpen={!!selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onDelete={handleDelete}
        />
      </div>
    </Layout>
  );
}
