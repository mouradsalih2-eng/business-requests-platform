import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Spinner } from '../components/ui/Spinner';
import { requests as requestsApi, users as usersApi, featureFlags as featureFlagsApi } from '../lib/api';
import { Toggle } from '../components/ui/Toggle';
import { useFeatureFlags } from '../context/FeatureFlagContext';

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
  const svgPaddingX = 10;
  const svgPaddingTop = 40; // Extra padding at top for circles and bezier overshoot
  const svgPaddingBottom = 10;

  // Convert percentages to SVG coordinates
  const svgPoints = points.map(p => ({
    x: svgPaddingX + (p.xPercent / 100) * (svgWidth - svgPaddingX * 2),
    y: svgPaddingTop + (p.yPercent / 100) * (svgHeight - svgPaddingTop - svgPaddingBottom),
    ...p
  }));

  // Create smooth bezier curve path using Catmull-Rom spline
  const createSmoothPath = (points) => {
    if (points.length < 2) return '';
    if (points.length === 2) {
      return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
    }

    let path = `M ${points[0].x} ${points[0].y}`;

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? i : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2 >= points.length ? i + 1 : i + 2];

      // Catmull-Rom to Bezier conversion (lower tension = less overshoot)
      const tension = 0.2;
      const cp1x = p1.x + (p2.x - p0.x) * tension;
      const cp1y = p1.y + (p2.y - p0.y) * tension;
      const cp2x = p2.x - (p3.x - p1.x) * tension;
      const cp2y = p2.y - (p3.y - p1.y) * tension;

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }

    return path;
  };

  const linePath = createSmoothPath(svgPoints);

  // Create area path using the smooth curve
  const areaPath = linePath +
    ` L ${svgPoints[svgPoints.length - 1].x} ${svgHeight - svgPaddingBottom}` +
    ` L ${svgPoints[0].x} ${svgHeight - svgPaddingBottom} Z`;

  return (
    <div className="w-full h-full flex flex-col">
      {/* Chart container */}
      <div
        className="relative flex-1 min-h-0"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredPoint(null)}
      >
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-6 w-8 flex flex-col justify-between text-xs text-neutral-400 dark:text-neutral-500 text-right pr-1">
          <span>{maxCount}</span>
          <span>{Math.round(maxCount / 2)}</span>
          <span>0</span>
        </div>

        {/* Chart area */}
        <div className="absolute left-8 right-0 top-0 bottom-6 bg-neutral-50/50 dark:bg-neutral-800/50 rounded border border-neutral-100 dark:border-neutral-700">
          {/* SVG Chart */}
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-full"
            preserveAspectRatio="none"
          >
            {/* Definitions for gradients */}
            <defs>
              {/* Area gradient - light theme (subtle) */}
              <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
              </linearGradient>
              {/* Area gradient - dark theme (subtle) */}
              <linearGradient id="chartGradientDark" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#818cf8" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
              <line
                key={i}
                x1={svgPaddingX}
                y1={svgPaddingTop + (svgHeight - svgPaddingTop - svgPaddingBottom) * ratio}
                x2={svgWidth - svgPaddingX}
                y2={svgPaddingTop + (svgHeight - svgPaddingTop - svgPaddingBottom) * ratio}
                className="stroke-neutral-200 dark:stroke-neutral-700"
                strokeWidth="1"
              />
            ))}

            {/* Area fill - uses CSS class to switch gradient based on theme */}
            <path
              d={areaPath}
              className="fill-[url(#chartGradient)] dark:fill-[url(#chartGradientDark)]"
            />

            {/* Line */}
            <path
              d={linePath}
              fill="none"
              className="stroke-indigo-500 dark:stroke-indigo-400"
              strokeWidth="2.5"
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
                r={hoveredPoint?.index === i ? 6 : 4}
                className={`
                  transition-all duration-150
                  ${hoveredPoint?.index === i
                    ? 'fill-indigo-600 dark:fill-indigo-300'
                    : 'fill-indigo-500 dark:fill-indigo-400'}
                `}
                stroke="white"
                strokeWidth="2"
              />
            ))}
          </svg>

          {/* Hover vertical line using CSS (overlay) */}
          {hoveredPoint && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-indigo-400/60 dark:bg-indigo-400/50 pointer-events-none"
              style={{ left: `${hoveredPoint.xPercent}%` }}
            />
          )}
        </div>

        {/* Tooltip with frosted glass effect */}
        {hoveredPoint && (
          <div
            className="absolute z-20 px-4 py-2.5 backdrop-blur-md bg-neutral-900/90 dark:bg-[#1c1f26]/95 text-white text-xs rounded-xl shadow-xl border border-neutral-700/50 pointer-events-none whitespace-nowrap"
            style={{
              left: Math.min(Math.max(tooltipPos.x, 60), window.innerWidth - 120),
              top: Math.max(10, tooltipPos.y - 75),
              transform: 'translateX(-50%)'
            }}
          >
            <div className="font-semibold text-sm text-white">{hoveredPoint.count} request{hoveredPoint.count !== 1 ? 's' : ''}</div>
            <div className="text-neutral-400">{hoveredPoint.label}</div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-neutral-900/90 dark:border-t-[#1c1f26]/95" />
          </div>
        )}

        {/* X-axis labels */}
        <div className="absolute left-8 right-0 bottom-0 h-6 flex justify-between items-center text-xs text-neutral-400 dark:text-neutral-500">
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
        <span className="text-neutral-700 dark:text-neutral-300">{label}</span>
        <span className="text-neutral-500 dark:text-neutral-400">{value} ({percentage.toFixed(0)}%)</span>
      </div>
      <div className="h-2 bg-neutral-100 dark:bg-neutral-700/50 rounded-full overflow-hidden">
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
  { value: 'archived', label: 'Archived' },
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
  const navigate = useNavigate();
  const { refresh: refreshFeatureFlags } = useFeatureFlags();
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

  // Feature flags state
  const [flagsList, setFlagsList] = useState([]);
  const [flagsLoading, setFlagsLoading] = useState(false);
  const [togglingFlag, setTogglingFlag] = useState(null);

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

  // Seed data state
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState(null);

  // Archive animation state
  const [archivingIds, setArchivingIds] = useState(new Set());

  useEffect(() => {
    if (activeTab === 'requests') {
      loadRequests();
    } else if (activeTab === 'users') {
      loadUsers();
    } else if (activeTab === 'analytics') {
      loadAnalytics();
    } else if (activeTab === 'flags') {
      loadFlags();
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

  const loadFlags = async () => {
    setFlagsLoading(true);
    try {
      const data = await featureFlagsApi.getAll();
      setFlagsList(data);
    } catch (err) {
      console.error('Failed to load feature flags:', err);
    } finally {
      setFlagsLoading(false);
    }
  };

  const handleToggleFlag = async (name, enabled) => {
    setTogglingFlag(name);
    try {
      await featureFlagsApi.toggle(name, enabled);
      setFlagsList((prev) =>
        prev.map((f) => (f.name === name ? { ...f, enabled } : f))
      );
      // Refresh the global feature flags context
      refreshFeatureFlags();
    } catch (err) {
      console.error('Failed to toggle flag:', err);
    } finally {
      setTogglingFlag(null);
    }
  };

  // Format flag name for display (snake_case to Title Case)
  const formatFlagName = (name) => {
    return name
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
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
    // If archiving and not filtering by archived status, animate out then remove
    if (newStatus === 'archived' && filters.status !== 'archived') {
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

  const handleSeedData = async () => {
    if (seeding) return;

    const confirmed = window.confirm(
      'This will generate test users and requests to populate the platform. Continue?'
    );
    if (!confirmed) return;

    setSeeding(true);
    setSeedResult(null);
    try {
      const result = await usersApi.seedData();
      setSeedResult(result);
      // Reload data after seeding
      if (activeTab === 'users') {
        loadUsers();
      } else if (activeTab === 'requests') {
        loadRequests();
      } else if (activeTab === 'analytics') {
        loadAnalytics();
      }
    } catch (err) {
      console.error('Seed error:', err);
      setSeedResult({ error: err.message || 'Failed to seed data' });
    } finally {
      setSeeding(false);
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
        {/* Header with back button */}
        <div className="flex items-center gap-4 mb-6">
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
            <h1 className="text-xl sm:text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Admin Panel</h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">Manage requests and users</p>
          </div>
        </div>

        {/* Stats Grid - 2 cols mobile, 4 cols desktop */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="bg-white dark:bg-[#21262D] border border-neutral-100 dark:border-[#30363D] rounded-lg p-3 sm:p-4 text-center">
            <div className="text-2xl sm:text-3xl font-semibold text-neutral-900 dark:text-[#E6EDF3]">{stats.total}</div>
            <div className="text-xs sm:text-sm text-neutral-500 dark:text-[#8B949E]">Total</div>
          </div>
          <div className="bg-white dark:bg-[#21262D] border border-neutral-100 dark:border-[#30363D] rounded-lg p-3 sm:p-4 text-center">
            <div className="text-2xl sm:text-3xl font-semibold text-neutral-900 dark:text-[#E6EDF3]">{stats.pending}</div>
            <div className="text-xs sm:text-sm text-neutral-500 dark:text-[#8B949E]">Pending</div>
          </div>
          <div className="bg-white dark:bg-[#21262D] border border-neutral-100 dark:border-[#30363D] rounded-lg p-3 sm:p-4 text-center">
            <div className="text-2xl sm:text-3xl font-semibold text-neutral-900 dark:text-[#E6EDF3]">{stats.inProgress}</div>
            <div className="text-xs sm:text-sm text-neutral-500 dark:text-[#8B949E]">In Progress</div>
          </div>
          <div className="bg-white dark:bg-[#21262D] border border-neutral-100 dark:border-[#30363D] rounded-lg p-3 sm:p-4 text-center">
            <div className="text-2xl sm:text-3xl font-semibold text-neutral-900 dark:text-[#E6EDF3]">{stats.completed}</div>
            <div className="text-xs sm:text-sm text-neutral-500 dark:text-[#8B949E]">Completed</div>
          </div>
        </div>

        {/* Tabs - full width on mobile */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('requests')}
            className={`
              flex-1 sm:flex-none px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
              ${activeTab === 'requests'
                ? 'bg-[#4F46E5] dark:bg-[#6366F1] text-white'
                : 'bg-neutral-100 dark:bg-[#21262D] text-neutral-600 dark:text-[#8B949E] hover:bg-neutral-200 dark:hover:bg-[#2D333B] active:bg-neutral-300 dark:active:bg-[#3D444D]'
              }
            `}
          >
            Requests
            {stats.unread > 0 && activeTab !== 'requests' && (
              <span className="ml-2 px-1.5 py-0.5 bg-[#4F46E5] dark:bg-[#6366F1] text-white text-xs rounded-full">
                {stats.unread}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`
              flex-1 sm:flex-none px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
              ${activeTab === 'analytics'
                ? 'bg-[#4F46E5] dark:bg-[#6366F1] text-white'
                : 'bg-neutral-100 dark:bg-[#21262D] text-neutral-600 dark:text-[#8B949E] hover:bg-neutral-200 dark:hover:bg-[#2D333B] active:bg-neutral-300 dark:active:bg-[#3D444D]'
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
                ? 'bg-[#4F46E5] dark:bg-[#6366F1] text-white'
                : 'bg-neutral-100 dark:bg-[#21262D] text-neutral-600 dark:text-[#8B949E] hover:bg-neutral-200 dark:hover:bg-[#2D333B] active:bg-neutral-300 dark:active:bg-[#3D444D]'
              }
            `}
          >
            Users
          </button>
          <button
            onClick={() => setActiveTab('flags')}
            className={`
              flex-1 sm:flex-none px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
              ${activeTab === 'flags'
                ? 'bg-[#4F46E5] dark:bg-[#6366F1] text-white'
                : 'bg-neutral-100 dark:bg-[#21262D] text-neutral-600 dark:text-[#8B949E] hover:bg-neutral-200 dark:hover:bg-[#2D333B] active:bg-neutral-300 dark:active:bg-[#3D444D]'
              }
            `}
          >
            Flags
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
                    ? 'bg-neutral-900 dark:bg-neutral-100 border-neutral-900 dark:border-neutral-100 text-white dark:text-neutral-900'
                    : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-700'
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

            {/* Request count */}
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">{requestsList.length} request{requestsList.length !== 1 ? 's' : ''}</p>

            {/* Request List */}
            {loading ? (
              <SkeletonList count={4} />
            ) : (
              <RequestList
                requests={requestsList}
                onRequestClick={handleRequestClick}
                onVoteChange={handleVoteChange}
                exitingIds={archivingIds}
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
              <h3 className="font-medium text-neutral-900 dark:text-neutral-100">Request Trends</h3>
              <Select
                value={analyticsPeriod}
                onChange={(e) => setAnalyticsPeriod(e.target.value)}
                options={analyticsPeriodOptions}
                className="w-40"
              />
            </div>

            {analyticsLoading ? (
              <div className="text-center py-12">
                <Spinner size="md" className="mx-auto mb-2" />
                <p className="text-neutral-500 dark:text-neutral-400 text-sm">Loading analytics...</p>
              </div>
            ) : analyticsData ? (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="bg-white dark:bg-[#21262D] border border-neutral-100 dark:border-[#30363D] rounded-lg p-4 text-center">
                    <div className="text-2xl font-semibold text-neutral-900 dark:text-[#E6EDF3]">{analyticsData.summary.total}</div>
                    <div className="text-xs text-neutral-500 dark:text-[#8B949E]">Total Requests</div>
                  </div>
                  <div className="bg-white dark:bg-[#21262D] border border-neutral-100 dark:border-[#30363D] rounded-lg p-4 text-center">
                    <div className="text-2xl font-semibold text-amber-600 dark:text-[#E3B341]">{analyticsData.summary.pending}</div>
                    <div className="text-xs text-neutral-500 dark:text-[#8B949E]">Pending</div>
                  </div>
                  <div className="bg-white dark:bg-[#21262D] border border-neutral-100 dark:border-[#30363D] rounded-lg p-4 text-center">
                    <div className="text-2xl font-semibold text-indigo-600 dark:text-[#A5B4FC]">{analyticsData.summary.inProgress}</div>
                    <div className="text-xs text-neutral-500 dark:text-[#8B949E]">In Progress</div>
                  </div>
                  <div className="bg-white dark:bg-[#21262D] border border-neutral-100 dark:border-[#30363D] rounded-lg p-4 text-center">
                    <div className="text-2xl font-semibold text-green-600 dark:text-[#3FB950]">{analyticsData.summary.completed}</div>
                    <div className="text-xs text-neutral-500 dark:text-[#8B949E]">Completed</div>
                  </div>
                  <div className="bg-white dark:bg-[#21262D] border border-neutral-100 dark:border-[#30363D] rounded-lg p-4 text-center">
                    <div className="text-2xl font-semibold text-slate-500 dark:text-[#8B949E]">{analyticsData.summary.archived || 0}</div>
                    <div className="text-xs text-neutral-500 dark:text-[#8B949E]">Archived</div>
                  </div>
                </div>

                {/* Trend Chart */}
                <div className="bg-white dark:bg-[#21262D] border border-neutral-100 dark:border-[#30363D] rounded-lg p-4 sm:p-6">
                  <h4 className="text-sm font-medium text-neutral-700 dark:text-[#E6EDF3] mb-4">Submissions Over Time</h4>
                  <div className="h-64 relative">
                    {analyticsData.trendData.length > 0 ? (
                      <TrendChart data={analyticsData.trendData} />
                    ) : (
                      <div className="flex items-center justify-center h-full text-neutral-400 dark:text-[#8B949E]">
                        No data for this period
                      </div>
                    )}
                  </div>
                </div>

                {/* Breakdowns - 2x2 grid */}
                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Category Breakdown */}
                  <div className="bg-white dark:bg-[#21262D] border border-neutral-100 dark:border-[#30363D] rounded-lg p-4 sm:p-6">
                    <h4 className="text-sm font-medium text-neutral-700 dark:text-[#E6EDF3] mb-4">By Category</h4>
                    <div className="space-y-3">
                      <BreakdownBar label="Bug" value={analyticsData.categoryBreakdown.bug} total={analyticsData.summary.total} color="bg-red-500" />
                      <BreakdownBar label="New Feature" value={analyticsData.categoryBreakdown.new_feature} total={analyticsData.summary.total} color="bg-indigo-500" />
                      <BreakdownBar label="Optimization" value={analyticsData.categoryBreakdown.optimization} total={analyticsData.summary.total} color="bg-green-500" />
                    </div>
                  </div>

                  {/* Priority Breakdown */}
                  <div className="bg-white dark:bg-[#21262D] border border-neutral-100 dark:border-[#30363D] rounded-lg p-4 sm:p-6">
                    <h4 className="text-sm font-medium text-neutral-700 dark:text-[#E6EDF3] mb-4">By Priority</h4>
                    <div className="space-y-3">
                      <BreakdownBar label="High" value={analyticsData.priorityBreakdown.high} total={analyticsData.summary.total} color="bg-red-500" />
                      <BreakdownBar label="Medium" value={analyticsData.priorityBreakdown.medium} total={analyticsData.summary.total} color="bg-amber-500" />
                      <BreakdownBar label="Low" value={analyticsData.priorityBreakdown.low} total={analyticsData.summary.total} color="bg-green-500" />
                    </div>
                  </div>

                  {/* Team Breakdown */}
                  <div className="bg-white dark:bg-[#21262D] border border-neutral-100 dark:border-[#30363D] rounded-lg p-4 sm:p-6">
                    <h4 className="text-sm font-medium text-neutral-700 dark:text-[#E6EDF3] mb-4">By Team</h4>
                    <div className="space-y-3">
                      <BreakdownBar label="Manufacturing" value={analyticsData.teamBreakdown?.Manufacturing || 0} total={analyticsData.summary.total} color="bg-indigo-500" />
                      <BreakdownBar label="Sales" value={analyticsData.teamBreakdown?.Sales || 0} total={analyticsData.summary.total} color="bg-emerald-500" />
                      <BreakdownBar label="Service" value={analyticsData.teamBreakdown?.Service || 0} total={analyticsData.summary.total} color="bg-orange-500" />
                      <BreakdownBar label="Energy" value={analyticsData.teamBreakdown?.Energy || 0} total={analyticsData.summary.total} color="bg-cyan-500" />
                    </div>
                  </div>

                  {/* Region Breakdown */}
                  <div className="bg-white dark:bg-[#21262D] border border-neutral-100 dark:border-[#30363D] rounded-lg p-4 sm:p-6">
                    <h4 className="text-sm font-medium text-neutral-700 dark:text-[#E6EDF3] mb-4">By Region</h4>
                    <div className="space-y-3">
                      <BreakdownBar label="EMEA" value={analyticsData.regionBreakdown?.EMEA || 0} total={analyticsData.summary.total} color="bg-violet-500" />
                      <BreakdownBar label="North America" value={analyticsData.regionBreakdown?.['North America'] || 0} total={analyticsData.summary.total} color="bg-rose-500" />
                      <BreakdownBar label="APAC" value={analyticsData.regionBreakdown?.APAC || 0} total={analyticsData.summary.total} color="bg-teal-500" />
                      <BreakdownBar label="Global" value={analyticsData.regionBreakdown?.Global || 0} total={analyticsData.summary.total} color="bg-slate-500" />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-neutral-500 dark:text-neutral-400">
                No analytics data available
              </div>
            )}
          </div>
        ) : null}

        {/* Users Section */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            {/* Seed Data Card */}
            <div className="bg-white dark:bg-[#21262D] border border-neutral-100 dark:border-[#30363D] rounded-lg p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="font-medium text-neutral-900 dark:text-[#E6EDF3]">Generate Test Data</h3>
                  <p className="text-sm text-neutral-500 dark:text-[#8B949E] mt-1">
                    Populate the platform with sample users, requests, votes, and comments for testing.
                  </p>
                </div>
                <Button
                  onClick={handleSeedData}
                  disabled={seeding}
                  variant="secondary"
                  className="whitespace-nowrap"
                >
                  {seeding ? (
                    <span className="flex items-center gap-2">
                      <Spinner size="sm" />
                      Generating...
                    </span>
                  ) : (
                    'Generate Test Data'
                  )}
                </Button>
              </div>

              {seedResult && (
                <div className={`mt-4 p-3 rounded-lg text-sm ${
                  seedResult.error
                    ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/50'
                    : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-[#3FB950] border border-green-200 dark:border-green-800/50'
                }`}>
                  {seedResult.error ? (
                    <p>{seedResult.error}</p>
                  ) : (
                    <p>
                      Generated: {seedResult.users} users, {seedResult.requests} requests,{' '}
                      {seedResult.votes} votes, {seedResult.comments} comments
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Users Table */}
            <div className="bg-white dark:bg-[#21262D] border border-neutral-100 dark:border-[#30363D] rounded-lg">
              {/* Users Header */}
              <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-neutral-100 dark:border-[#30363D]">
                <h3 className="font-medium text-neutral-900 dark:text-[#E6EDF3]">Users ({usersList.length})</h3>
                <Button onClick={() => setShowAddUserModal(true)} size="sm">
                  Add User
                </Button>
              </div>

            {loading ? (
              <div className="text-center py-12">
                <Spinner size="md" className="mx-auto mb-2" />
                <p className="text-neutral-500 dark:text-neutral-400 text-sm">Loading users...</p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-neutral-100 dark:border-[#30363D]">
                        <th className="text-left px-6 py-3 text-xs font-medium text-neutral-500 dark:text-[#8B949E] uppercase tracking-wider">Name</th>
                        <th className="text-left px-6 py-3 text-xs font-medium text-neutral-500 dark:text-[#8B949E] uppercase tracking-wider">Email</th>
                        <th className="text-left px-6 py-3 text-xs font-medium text-neutral-500 dark:text-[#8B949E] uppercase tracking-wider">Role</th>
                        <th className="text-left px-6 py-3 text-xs font-medium text-neutral-500 dark:text-[#8B949E] uppercase tracking-wider">Requests</th>
                        <th className="text-left px-6 py-3 text-xs font-medium text-neutral-500 dark:text-[#8B949E] uppercase tracking-wider">Joined</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-[#30363D]">
                      {usersList.map((user) => (
                        <tr key={user.id} className="hover:bg-neutral-50 dark:hover:bg-[#161B22] transition-colors">
                          <td className="px-6 py-4 text-sm text-neutral-900 dark:text-[#E6EDF3] font-medium">{user.name}</td>
                          <td className="px-6 py-4 text-sm text-neutral-500 dark:text-[#8B949E]">{user.email}</td>
                          <td className="px-6 py-4">
                            <select
                              value={user.role}
                              onChange={(e) => handleRoleChange(user.id, e.target.value)}
                              className="text-sm border border-neutral-200 dark:border-[#30363D] rounded-lg px-2 py-1.5 bg-white dark:bg-[#161B22] text-neutral-900 dark:text-[#E6EDF3]
                                         focus:outline-none focus:border-neutral-400 dark:focus:border-[#484F58] transition-colors"
                            >
                              <option value="employee">Employee</option>
                              <option value="admin">Admin</option>
                            </select>
                          </td>
                          <td className="px-6 py-4 text-sm text-neutral-500 dark:text-[#8B949E]">{user.request_count}</td>
                          <td className="px-6 py-4 text-sm text-neutral-500 dark:text-[#8B949E]">
                            {new Date(user.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="sm:hidden divide-y divide-neutral-100 dark:divide-[#30363D]">
                  {usersList.map((user) => (
                    <div key={user.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-neutral-900 dark:text-[#E6EDF3]">{user.name}</p>
                          <p className="text-sm text-neutral-500 dark:text-[#8B949E]">{user.email}</p>
                        </div>
                        <span className={`
                          text-xs px-2 py-1 rounded-full font-medium
                          ${user.role === 'admin' ? 'bg-[#4F46E5] dark:bg-[#6366F1] text-white' : 'bg-neutral-100 dark:bg-[#30363D] text-neutral-600 dark:text-[#8B949E]'}
                        `}>
                          {user.role}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-neutral-500 dark:text-[#8B949E]">{user.request_count} requests</span>
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          className="text-sm border border-neutral-200 dark:border-[#30363D] rounded-lg px-3 py-1.5 bg-white dark:bg-[#161B22] text-neutral-900 dark:text-[#E6EDF3]
                                     focus:outline-none focus:border-neutral-400 dark:focus:border-[#484F58]"
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
          </div>
        )}

        {/* Feature Flags Section */}
        {activeTab === 'flags' && (
          <div className="bg-white dark:bg-[#21262D] border border-neutral-100 dark:border-[#30363D] rounded-xl p-4 sm:p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-[#E6EDF3]">Feature Flags</h2>
              <p className="text-sm text-neutral-500 dark:text-[#8B949E] mt-1">
                Toggle features on/off to control the platform experience.
              </p>
            </div>

            {flagsLoading ? (
              <div className="text-center py-12">
                <Spinner size="md" className="mx-auto mb-2" />
                <p className="text-neutral-500 dark:text-neutral-400 text-sm">Loading feature flags...</p>
              </div>
            ) : flagsList.length === 0 ? (
              <div className="text-center py-12 text-neutral-500 dark:text-neutral-400">
                No feature flags found
              </div>
            ) : (
              <div className="space-y-4">
                {flagsList.map((flag) => (
                  <div
                    key={flag.name}
                    className="p-4 bg-neutral-50 dark:bg-[#161B22] rounded-lg border border-neutral-100 dark:border-[#30363D]"
                  >
                    <Toggle
                      label={formatFlagName(flag.name)}
                      description={flag.description}
                      checked={!!flag.enabled}
                      onChange={(enabled) => handleToggleFlag(flag.name, enabled)}
                      disabled={togglingFlag === flag.name}
                    />
                  </div>
                ))}
              </div>
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
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
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
