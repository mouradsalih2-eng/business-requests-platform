import { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/layout/Layout';
import { RequestList } from '../components/requests/RequestList';
import { RequestDetail } from '../components/requests/RequestDetail';
import { Modal } from '../components/ui/Modal';
import { SideSheet } from '../components/ui/SideSheet';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { SearchInput } from '../components/ui/SearchInput';
import { SkeletonList } from '../components/ui/Skeleton';
import { requests as requestsApi, users as usersApi } from '../lib/api';

/**
 * TrendChart - Simple line chart for displaying trends with hover tooltips
 */
function TrendChart({ data }) {
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  if (!data || data.length === 0) return null;

  const maxCount = Math.max(...data.map(d => d.count), 1);

  // Calculate points as percentages for responsive layout
  const points = data.map((d, i) => {
    const xPercent = (i / Math.max(data.length - 1, 1)) * 100;
    const yPercent = 100 - (d.count / maxCount) * 100;
    return { xPercent, yPercent, index: i, ...d };
  });

  const handleMouseMove = (e) => {
    const container = e.currentTarget;
    const rect = container.getBoundingClientRect();
    const xPercent = ((e.clientX - rect.left) / rect.width) * 100;

    // Find closest point
    let closestPoint = points[0];
    let closestDist = Math.abs(xPercent - points[0].xPercent);

    points.forEach(p => {
      const dist = Math.abs(xPercent - p.xPercent);
      if (dist < closestDist) {
        closestDist = dist;
        closestPoint = p;
      }
    });

    if (closestDist < 15) {
      setHoveredPoint(closestPoint);
      setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    } else {
      setHoveredPoint(null);
    }
  };

  // SVG viewBox dimensions
  const svgWidth = 1000;
  const svgHeight = 400;
  const svgPadding = 10;

  // Convert percentages to SVG coordinates
  const svgPoints = points.map(p => ({
    x: svgPadding + (p.xPercent / 100) * (svgWidth - svgPadding * 2),
    y: svgPadding + (p.yPercent / 100) * (svgHeight - svgPadding * 2),
    ...p
  }));

  // Create line path
  const linePath = svgPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  // Create area path
  const areaPath = linePath +
    ` L ${svgPoints[svgPoints.length - 1].x} ${svgHeight - svgPadding}` +
    ` L ${svgPadding} ${svgHeight - svgPadding} Z`;

  return (
    <div className="w-full h-full flex flex-col">
      {/* Chart container */}
      <div
        className="relative flex-1 min-h-0"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredPoint(null)}
      >
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-6 w-8 flex flex-col justify-between text-xs text-neutral-400 text-right pr-1">
          <span>{maxCount}</span>
          <span>{Math.round(maxCount / 2)}</span>
          <span>0</span>
        </div>

        {/* Chart area */}
        <div className="absolute left-8 right-0 top-0 bottom-6 bg-neutral-50/50 rounded border border-neutral-100 overflow-hidden">
          {/* SVG Chart */}
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-full"
            preserveAspectRatio="none"
          >
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
              <line
                key={i}
                x1={svgPadding}
                y1={svgPadding + (svgHeight - svgPadding * 2) * ratio}
                x2={svgWidth - svgPadding}
                y2={svgPadding + (svgHeight - svgPadding * 2) * ratio}
                stroke="#e5e5e5"
                strokeWidth="1"
              />
            ))}

            {/* Gradient definition */}
            <defs>
              <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {/* Area fill */}
            <path d={areaPath} fill="url(#chartGradient)" />

            {/* Line */}
            <path
              d={linePath}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />

            {/* Points */}
            {svgPoints.map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={hoveredPoint?.index === i ? 8 : 5}
                fill={hoveredPoint?.index === i ? '#1d4ed8' : '#3b82f6'}
                stroke="white"
                strokeWidth="2"
              />
            ))}
          </svg>

          {/* Hover vertical line using CSS (overlay) */}
          {hoveredPoint && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-blue-400/50 pointer-events-none"
              style={{ left: `${hoveredPoint.xPercent}%` }}
            />
          )}
        </div>

        {/* Tooltip */}
        {hoveredPoint && (
          <div
            className="absolute z-20 px-3 py-2 bg-neutral-900 text-white text-xs rounded-lg shadow-lg pointer-events-none whitespace-nowrap"
            style={{
              left: Math.min(Math.max(tooltipPos.x, 60), window.innerWidth - 120),
              top: Math.max(10, tooltipPos.y - 70),
              transform: 'translateX(-50%)'
            }}
          >
            <div className="font-semibold text-sm">{hoveredPoint.count} request{hoveredPoint.count !== 1 ? 's' : ''}</div>
            <div className="text-neutral-400">{hoveredPoint.label}</div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-neutral-900" />
          </div>
        )}

        {/* X-axis labels */}
        <div className="absolute left-8 right-0 bottom-0 h-6 flex justify-between items-center text-xs text-neutral-400">
          {data.length <= 7 ? (
            data.map((d, i) => (
              <span key={i} className="truncate max-w-[50px]" title={d.label}>
                {d.label.split('-').slice(1).join('/') || d.label.slice(0, 6)}
              </span>
            ))
          ) : (
            <>
              <span>{data[0].label.slice(0, 10)}</span>
              <span>{data[Math.floor(data.length / 2)].label.slice(0, 10)}</span>
              <span>{data[data.length - 1].label.slice(0, 10)}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * BreakdownBar - Horizontal bar for showing category/priority breakdown
 */
function BreakdownBar({ label, value, total, color }) {
  const percentage = total > 0 ? (value / total) * 100 : 0;

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-neutral-700">{label}</span>
        <span className="text-neutral-500">{value} ({percentage.toFixed(0)}%)</span>
      </div>
      <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-500 ease-out rounded-full`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

/**
 * AdminPanel - Mobile-first responsive admin dashboard
 * Manage requests and users with touch-friendly interface
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

const priorityOptions = [
  { value: '', label: 'All Priorities' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const sortOptions = [
  { value: 'recency', label: 'Most Recent' },
  { value: 'popularity', label: 'Most Popular' },
  { value: 'upvotes', label: 'Most Upvotes' },
];

const timePeriodOptions = [
  { value: '', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: '7days', label: 'Last 7 Days' },
  { value: '30days', label: 'Last 30 Days' },
  { value: '90days', label: 'Last 90 Days' },
];

const analyticsPeriodOptions = [
  { value: '7days', label: 'Last 7 Days' },
  { value: '30days', label: 'Last 30 Days' },
  { value: '90days', label: 'Last 90 Days' },
  { value: 'all', label: 'All Time' },
];

const roleOptions = [
  { value: 'employee', label: 'Employee' },
  { value: 'admin', label: 'Admin' },
];

export function AdminPanel() {
  const [activeTab, setActiveTab] = useState('requests');
  const [requestsList, setRequestsList] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    priority: '',
    sort: 'recency',
    timePeriod: '',
    search: '',
  });

  // Analytics state
  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsPeriod, setAnalyticsPeriod] = useState('7days');
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Add user modal state
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'employee',
  });
  const [addUserError, setAddUserError] = useState('');
  const [addingUser, setAddingUser] = useState(false);

  useEffect(() => {
    if (activeTab === 'requests') {
      loadRequests();
    } else if (activeTab === 'users') {
      loadUsers();
    } else if (activeTab === 'analytics') {
      loadAnalytics();
    }
  }, [activeTab, filters, analyticsPeriod]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const params = { order: 'desc' };
      if (filters.status) params.status = filters.status;
      if (filters.category) params.category = filters.category;
      if (filters.priority) params.priority = filters.priority;
      if (filters.sort !== 'recency') params.sort = filters.sort;
      if (filters.timePeriod) params.timePeriod = filters.timePeriod;
      if (filters.search) params.search = filters.search;

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

  const loadAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const data = await requestsApi.getAnalytics(analyticsPeriod);
      setAnalyticsData(data);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await usersApi.getAll();
      setUsersList(data);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleRequestClick = async (request) => {
    try {
      const fullRequest = await requestsApi.getOne(request.id);
      setSelectedRequest(fullRequest);

      // Mark as read if unread
      if (!request.isRead) {
        await requestsApi.markAsRead(request.id);
        // Update local state to reflect read status
        setRequestsList((prev) =>
          prev.map((r) => (r.id === request.id ? { ...r, isRead: true } : r))
        );
      }
    } catch (err) {
      console.error('Failed to load request:', err);
    }
  };

  const handleStatusUpdate = (requestId, newStatus) => {
    setRequestsList((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, status: newStatus } : r))
    );
    if (selectedRequest?.id === requestId) {
      setSelectedRequest((prev) => ({ ...prev, status: newStatus }));
    }
  };

  const handleDelete = (requestId) => {
    setRequestsList((prev) => prev.filter((r) => r.id !== requestId));
    setSelectedRequest(null);
  };

  const handleVoteChange = useCallback((requestId, { upvotes, likes }) => {
    setRequestsList((prev) =>
      prev.map((r) =>
        r.id === requestId ? { ...r, upvotes, likes } : r
      )
    );
  }, []);

  const handleRoleChange = async (userId, newRole) => {
    try {
      await usersApi.updateRole(userId, newRole);
      setUsersList((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
    } catch (err) {
      console.error('Failed to update role:', err);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setAddUserError('');
    setAddingUser(true);

    try {
      const createdUser = await usersApi.create(newUser);
      setUsersList((prev) => [{ ...createdUser, request_count: 0 }, ...prev]);
      setShowAddUserModal(false);
      setNewUser({ name: '', email: '', password: '', role: 'employee' });
    } catch (err) {
      setAddUserError(err.message || 'Failed to create user');
    } finally {
      setAddingUser(false);
    }
  };

  // Stats
  const stats = {
    total: requestsList.length,
    pending: requestsList.filter((r) => r.status === 'pending').length,
    inProgress: requestsList.filter((r) => r.status === 'in_progress').length,
    completed: requestsList.filter((r) => r.status === 'completed').length,
    unread: requestsList.filter((r) => !r.isRead).length,
  };

  const hasActiveFilters = filters.status || filters.category || filters.priority || filters.sort !== 'recency' || filters.timePeriod;
  const activeFilterCount = [filters.status, filters.category, filters.priority, filters.timePeriod, filters.sort !== 'recency' ? filters.sort : ''].filter(Boolean).length;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-semibold text-neutral-900">Admin Panel</h1>
          <p className="text-sm text-neutral-500 mt-1">Manage requests and users</p>
        </div>

        {/* Stats Grid - 2 cols mobile, 4 cols desktop */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="bg-white border border-neutral-100 rounded-lg p-3 sm:p-4 text-center">
            <div className="text-2xl sm:text-3xl font-semibold text-neutral-900">{stats.total}</div>
            <div className="text-xs sm:text-sm text-neutral-500">Total</div>
          </div>
          <div className="bg-white border border-neutral-100 rounded-lg p-3 sm:p-4 text-center">
            <div className="text-2xl sm:text-3xl font-semibold text-neutral-900">{stats.pending}</div>
            <div className="text-xs sm:text-sm text-neutral-500">Pending</div>
          </div>
          <div className="bg-white border border-neutral-100 rounded-lg p-3 sm:p-4 text-center">
            <div className="text-2xl sm:text-3xl font-semibold text-neutral-900">{stats.inProgress}</div>
            <div className="text-xs sm:text-sm text-neutral-500">In Progress</div>
          </div>
          <div className="bg-white border border-neutral-100 rounded-lg p-3 sm:p-4 text-center">
            <div className="text-2xl sm:text-3xl font-semibold text-neutral-900">{stats.completed}</div>
            <div className="text-xs sm:text-sm text-neutral-500">Completed</div>
          </div>
        </div>

        {/* Tabs - full width on mobile */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('requests')}
            className={`
              flex-1 sm:flex-none px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
              ${activeTab === 'requests'
                ? 'bg-neutral-900 text-white'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 active:bg-neutral-300'
              }
            `}
          >
            Requests
            {stats.unread > 0 && activeTab !== 'requests' && (
              <span className="ml-2 px-1.5 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                {stats.unread}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`
              flex-1 sm:flex-none px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
              ${activeTab === 'analytics'
                ? 'bg-neutral-900 text-white'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 active:bg-neutral-300'
              }
            `}
          >
            Analytics
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`
              flex-1 sm:flex-none px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
              ${activeTab === 'users'
                ? 'bg-neutral-900 text-white'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 active:bg-neutral-300'
              }
            `}
          >
            Users
          </button>
        </div>

        {activeTab === 'requests' ? (
          <>
            {/* Search and Filter Row */}
            <div className="flex items-center gap-3 mb-6">
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
                    ? 'bg-neutral-900 border-neutral-900 text-white'
                    : 'bg-white border-neutral-200 text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50'
                  }
                `}
                title="Filters"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
                </svg>
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 text-white text-xs font-medium rounded-full flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>

            {/* Request count */}
            <p className="text-sm text-neutral-500 mb-4">{requestsList.length} request{requestsList.length !== 1 ? 's' : ''}</p>

            {/* Request List */}
            {loading ? (
              <SkeletonList count={4} />
            ) : (
              <RequestList
                requests={requestsList}
                onRequestClick={handleRequestClick}
                onVoteChange={handleVoteChange}
                emptyMessage="No requests found"
                showUnreadBadge={true}
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
                  label="Date Range"
                  value={filters.timePeriod}
                  onChange={(e) => handleFilterChange('timePeriod', e.target.value)}
                  options={timePeriodOptions}
                />
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
                <Select
                  label="Priority"
                  value={filters.priority}
                  onChange={(e) => handleFilterChange('priority', e.target.value)}
                  options={priorityOptions}
                />
                <Select
                  label="Sort By"
                  value={filters.sort}
                  onChange={(e) => handleFilterChange('sort', e.target.value)}
                  options={sortOptions}
                />

                {/* Actions */}
                <div className="pt-4 border-t border-neutral-100 space-y-3">
                  <Button
                    onClick={() => setShowFilters(false)}
                    className="w-full"
                  >
                    Apply Filters
                  </Button>
                  {hasActiveFilters && (
                    <button
                      onClick={() => {
                        setFilters({
                          status: '',
                          category: '',
                          priority: '',
                          sort: 'recency',
                          timePeriod: '',
                          search: filters.search, // Keep search
                        });
                      }}
                      className="w-full text-sm text-neutral-500 hover:text-neutral-900 transition-colors py-2"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              </div>
            </SideSheet>
          </>
        ) : activeTab === 'analytics' ? (
          /* Analytics Section */
          <div className="space-y-6">
            {/* Period selector */}
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-neutral-900">Request Trends</h3>
              <Select
                value={analyticsPeriod}
                onChange={(e) => setAnalyticsPeriod(e.target.value)}
                options={analyticsPeriodOptions}
                className="w-40"
              />
            </div>

            {analyticsLoading ? (
              <div className="text-center py-12">
                <div className="inline-block w-6 h-6 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin mb-2" />
                <p className="text-neutral-500 text-sm">Loading analytics...</p>
              </div>
            ) : analyticsData ? (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white border border-neutral-100 rounded-lg p-4 text-center">
                    <div className="text-2xl font-semibold text-neutral-900">{analyticsData.summary.total}</div>
                    <div className="text-xs text-neutral-500">Total Requests</div>
                  </div>
                  <div className="bg-white border border-neutral-100 rounded-lg p-4 text-center">
                    <div className="text-2xl font-semibold text-amber-600">{analyticsData.summary.pending}</div>
                    <div className="text-xs text-neutral-500">Pending</div>
                  </div>
                  <div className="bg-white border border-neutral-100 rounded-lg p-4 text-center">
                    <div className="text-2xl font-semibold text-blue-600">{analyticsData.summary.inProgress}</div>
                    <div className="text-xs text-neutral-500">In Progress</div>
                  </div>
                  <div className="bg-white border border-neutral-100 rounded-lg p-4 text-center">
                    <div className="text-2xl font-semibold text-green-600">{analyticsData.summary.completed}</div>
                    <div className="text-xs text-neutral-500">Completed</div>
                  </div>
                </div>

                {/* Trend Chart */}
                <div className="bg-white border border-neutral-100 rounded-lg p-4 sm:p-6">
                  <h4 className="text-sm font-medium text-neutral-700 mb-4">Submissions Over Time</h4>
                  <div className="h-64 relative">
                    {analyticsData.trendData.length > 0 ? (
                      <TrendChart data={analyticsData.trendData} />
                    ) : (
                      <div className="flex items-center justify-center h-full text-neutral-400">
                        No data for this period
                      </div>
                    )}
                  </div>
                </div>

                {/* Breakdowns - 2x2 grid */}
                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Category Breakdown */}
                  <div className="bg-white border border-neutral-100 rounded-lg p-4 sm:p-6">
                    <h4 className="text-sm font-medium text-neutral-700 mb-4">By Category</h4>
                    <div className="space-y-3">
                      <BreakdownBar label="Bug" value={analyticsData.categoryBreakdown.bug} total={analyticsData.summary.total} color="bg-red-500" />
                      <BreakdownBar label="New Feature" value={analyticsData.categoryBreakdown.new_feature} total={analyticsData.summary.total} color="bg-blue-500" />
                      <BreakdownBar label="Optimization" value={analyticsData.categoryBreakdown.optimization} total={analyticsData.summary.total} color="bg-green-500" />
                    </div>
                  </div>

                  {/* Priority Breakdown */}
                  <div className="bg-white border border-neutral-100 rounded-lg p-4 sm:p-6">
                    <h4 className="text-sm font-medium text-neutral-700 mb-4">By Priority</h4>
                    <div className="space-y-3">
                      <BreakdownBar label="High" value={analyticsData.priorityBreakdown.high} total={analyticsData.summary.total} color="bg-red-500" />
                      <BreakdownBar label="Medium" value={analyticsData.priorityBreakdown.medium} total={analyticsData.summary.total} color="bg-amber-500" />
                      <BreakdownBar label="Low" value={analyticsData.priorityBreakdown.low} total={analyticsData.summary.total} color="bg-green-500" />
                    </div>
                  </div>

                  {/* Team Breakdown */}
                  <div className="bg-white border border-neutral-100 rounded-lg p-4 sm:p-6">
                    <h4 className="text-sm font-medium text-neutral-700 mb-4">By Team</h4>
                    <div className="space-y-3">
                      <BreakdownBar label="Manufacturing" value={analyticsData.teamBreakdown?.Manufacturing || 0} total={analyticsData.summary.total} color="bg-indigo-500" />
                      <BreakdownBar label="Sales" value={analyticsData.teamBreakdown?.Sales || 0} total={analyticsData.summary.total} color="bg-emerald-500" />
                      <BreakdownBar label="Service" value={analyticsData.teamBreakdown?.Service || 0} total={analyticsData.summary.total} color="bg-orange-500" />
                      <BreakdownBar label="Energy" value={analyticsData.teamBreakdown?.Energy || 0} total={analyticsData.summary.total} color="bg-cyan-500" />
                    </div>
                  </div>

                  {/* Region Breakdown */}
                  <div className="bg-white border border-neutral-100 rounded-lg p-4 sm:p-6">
                    <h4 className="text-sm font-medium text-neutral-700 mb-4">By Region</h4>
                    <div className="space-y-3">
                      <BreakdownBar label="EMEA" value={analyticsData.regionBreakdown?.EMEA || 0} total={analyticsData.summary.total} color="bg-violet-500" />
                      <BreakdownBar label="North America" value={analyticsData.regionBreakdown?.['North America'] || 0} total={analyticsData.summary.total} color="bg-pink-500" />
                      <BreakdownBar label="APAC" value={analyticsData.regionBreakdown?.APAC || 0} total={analyticsData.summary.total} color="bg-teal-500" />
                      <BreakdownBar label="Global" value={analyticsData.regionBreakdown?.Global || 0} total={analyticsData.summary.total} color="bg-slate-500" />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-neutral-500">
                No analytics data available
              </div>
            )}
          </div>
        ) : (
          /* Users Section */
          <div className="bg-white border border-neutral-100 rounded-lg">
            {/* Users Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-neutral-100">
              <h3 className="font-medium text-neutral-900">Users ({usersList.length})</h3>
              <Button onClick={() => setShowAddUserModal(true)} size="sm">
                Add User
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block w-6 h-6 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin mb-2" />
                <p className="text-neutral-500 text-sm">Loading users...</p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-neutral-100">
                        <th className="text-left px-6 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider">Name</th>
                        <th className="text-left px-6 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider">Email</th>
                        <th className="text-left px-6 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider">Role</th>
                        <th className="text-left px-6 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider">Requests</th>
                        <th className="text-left px-6 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider">Joined</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {usersList.map((user) => (
                        <tr key={user.id} className="hover:bg-neutral-50 transition-colors">
                          <td className="px-6 py-4 text-sm text-neutral-900 font-medium">{user.name}</td>
                          <td className="px-6 py-4 text-sm text-neutral-500">{user.email}</td>
                          <td className="px-6 py-4">
                            <select
                              value={user.role}
                              onChange={(e) => handleRoleChange(user.id, e.target.value)}
                              className="text-sm border border-neutral-200 rounded-lg px-2 py-1.5 bg-white
                                         focus:outline-none focus:border-neutral-400 transition-colors"
                            >
                              <option value="employee">Employee</option>
                              <option value="admin">Admin</option>
                            </select>
                          </td>
                          <td className="px-6 py-4 text-sm text-neutral-500">{user.request_count}</td>
                          <td className="px-6 py-4 text-sm text-neutral-500">
                            {new Date(user.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="sm:hidden divide-y divide-neutral-100">
                  {usersList.map((user) => (
                    <div key={user.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-neutral-900">{user.name}</p>
                          <p className="text-sm text-neutral-500">{user.email}</p>
                        </div>
                        <span className={`
                          text-xs px-2 py-1 rounded-full font-medium
                          ${user.role === 'admin' ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600'}
                        `}>
                          {user.role}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-neutral-500">{user.request_count} requests</span>
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          className="text-sm border border-neutral-200 rounded-lg px-3 py-1.5 bg-white
                                     focus:outline-none focus:border-neutral-400"
                        >
                          <option value="employee">Employee</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Request Detail Modal */}
        <RequestDetail
          request={selectedRequest}
          isOpen={!!selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onStatusUpdate={handleStatusUpdate}
          onDelete={handleDelete}
        />

        {/* Add User Modal */}
        <Modal
          isOpen={showAddUserModal}
          onClose={() => {
            setShowAddUserModal(false);
            setAddUserError('');
            setNewUser({ name: '', email: '', password: '', role: 'employee' });
          }}
          title="Add New User"
          size="md"
        >
          <form onSubmit={handleAddUser} className="space-y-4">
            {addUserError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {addUserError}
              </div>
            )}

            <Input
              label="Full Name"
              value={newUser.name}
              onChange={(e) => setNewUser((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="John Doe"
              required
            />

            <Input
              label="Email"
              type="email"
              value={newUser.email}
              onChange={(e) => setNewUser((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="user@example.com"
              required
            />

            <Input
              label="Password"
              type="password"
              value={newUser.password}
              onChange={(e) => setNewUser((prev) => ({ ...prev, password: e.target.value }))}
              placeholder="Minimum 6 characters"
              required
            />

            <Select
              label="Role"
              value={newUser.role}
              onChange={(e) => setNewUser((prev) => ({ ...prev, role: e.target.value }))}
              options={roleOptions}
            />

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                className="w-full sm:w-auto"
                onClick={() => {
                  setShowAddUserModal(false);
                  setAddUserError('');
                  setNewUser({ name: '', email: '', password: '', role: 'employee' });
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={addingUser} className="w-full sm:w-auto">
                {addingUser ? 'Creating...' : 'Create User'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </Layout>
  );
}
