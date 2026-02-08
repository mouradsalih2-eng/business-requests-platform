import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Spinner } from '../components/ui/Spinner';
import Avatar from '../components/ui/Avatar';
import { superAdmin, users as usersApi, projects as projectsApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useProject } from '../context/ProjectContext';

const STATUS_COLORS = {
  pending: 'bg-yellow-500',
  backlog: 'bg-neutral-400',
  in_progress: 'bg-blue-500',
  completed: 'bg-green-500',
  rejected: 'bg-red-500',
};

// Muted but distinguishable project colors for stacked chart
const PROJECT_PALETTE = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6',
  '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#14b8a6',
];

function getProjectColor(index) {
  return PROJECT_PALETTE[index % PROJECT_PALETTE.length];
}

// ─── Mini progress ring ───────────────────────────────────────
function ProgressRing({ value, size = 36, stroke = 3.5 }) {
  const radius = (size - stroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="currentColor" strokeWidth={stroke}
        className="text-neutral-100 dark:text-[#30363D]"
      />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="currentColor" strokeWidth={stroke}
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round"
        className="text-green-500 dark:text-green-400 transition-all duration-700"
      />
    </svg>
  );
}

// ─── Stacked Bar Chart ────────────────────────────────────────
function StackedChart({ trends, projectMap, enabledProjects }) {
  const [hoveredBar, setHoveredBar] = useState(null);

  if (!trends || trends.length === 0) return null;

  const projectIds = Object.keys(projectMap);
  const filtered = projectIds.filter(id => enabledProjects.has(id));

  // Find max stacked total for scaling
  const maxTotal = Math.max(
    ...trends.map(t => {
      return filtered.reduce((sum, pid) => sum + (t.projects[pid] || 0), 0);
    }),
    1
  );

  return (
    <div className="relative">
      <div className="flex items-end gap-[1px] h-36">
        {trends.map((t, i) => {
          const total = filtered.reduce((sum, pid) => sum + (t.projects[pid] || 0), 0);
          const heightPct = (total / maxTotal) * 100;

          return (
            <div
              key={i}
              className="flex-1 flex flex-col justify-end relative group cursor-default"
              style={{ height: '100%' }}
              onMouseEnter={() => setHoveredBar(i)}
              onMouseLeave={() => setHoveredBar(null)}
            >
              <div
                className="w-full rounded-t-sm overflow-hidden transition-opacity"
                style={{ height: `${Math.max(heightPct, total > 0 ? 3 : 0)}%` }}
              >
                {filtered.map((pid, j) => {
                  const count = t.projects[pid] || 0;
                  if (count === 0 || total === 0) return null;
                  return (
                    <div
                      key={pid}
                      style={{
                        height: `${(count / total) * 100}%`,
                        backgroundColor: getProjectColor(projectIds.indexOf(pid)),
                        opacity: hoveredBar === i ? 0.9 : 0.6,
                      }}
                      className="w-full transition-opacity duration-150"
                    />
                  );
                })}
              </div>

              {/* Tooltip */}
              {hoveredBar === i && total > 0 && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-[10px] px-2 py-1.5 rounded-md shadow-lg whitespace-nowrap z-10 pointer-events-none">
                  <p className="font-medium mb-0.5">{t.date}</p>
                  {filtered.map(pid => {
                    const count = t.projects[pid] || 0;
                    if (count === 0) return null;
                    return (
                      <div key={pid} className="flex items-center gap-1.5">
                        <span
                          className="w-1.5 h-1.5 rounded-full inline-block"
                          style={{ backgroundColor: getProjectColor(projectIds.indexOf(pid)) }}
                        />
                        <span>{projectMap[pid]}: {count}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-1.5 text-[10px] text-neutral-400 dark:text-[#484F58]">
        <span>{trends[0]?.date}</span>
        <span>{trends[trends.length - 1]?.date}</span>
      </div>
    </div>
  );
}

// ─── Activity item ────────────────────────────────────────────
const ACTION_ICONS = {
  status_change: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
    </svg>
  ),
  merge: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5-6L16.5 15m0 0L12 10.5m4.5 4.5V3" />
    </svg>
  ),
};

function ActivityItem({ activity }) {
  const icon = ACTION_ICONS[activity.action] || ACTION_ICONS.status_change;

  let description = activity.action.replace(/_/g, ' ');
  if (activity.action === 'status_change') {
    description = `changed status from ${(activity.old_value || '').replace(/_/g, ' ')} to ${(activity.new_value || '').replace(/_/g, ' ')}`;
  } else if (activity.action === 'merge') {
    description = 'merged a request';
  }

  const timeAgo = getTimeAgo(activity.created_at);

  return (
    <div className="flex items-start gap-3 py-2.5">
      <div className="mt-0.5 p-1.5 rounded-md bg-neutral-100 dark:bg-[#21262D] text-neutral-500 dark:text-[#8B949E] flex-shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-neutral-900 dark:text-[#E6EDF3]">
          <span className="font-medium">{activity.user_name}</span>
          {' '}{description}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="inline-flex items-center gap-1 text-[11px] text-neutral-400 dark:text-[#6E7681]">
            <span
              className="w-1.5 h-1.5 rounded-full inline-block"
              style={{ backgroundColor: getProjectColor(activity.project_id % PROJECT_PALETTE.length) }}
            />
            {activity.project_name}
          </span>
          <span className="text-[11px] text-neutral-400 dark:text-[#484F58]">{timeAgo}</span>
        </div>
      </div>
    </div>
  );
}

function getTimeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

// ─── Status Bar ───────────────────────────────────────────────
function StatusBar({ breakdown, height = 'h-1.5' }) {
  if (!breakdown || breakdown.total === 0) return null;
  return (
    <div className={`flex ${height} rounded-full overflow-hidden bg-neutral-100 dark:bg-[#30363D]`}>
      {Object.entries(STATUS_COLORS).map(([status, color]) => {
        const count = breakdown[status] || 0;
        if (count === 0) return null;
        return (
          <div
            key={status}
            className={`${color} transition-all`}
            style={{ width: `${(count / breakdown.total) * 100}%` }}
            title={`${status.replace('_', ' ')}: ${count}`}
          />
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Overview View
// ═══════════════════════════════════════════════════════════════
function OverviewView({ stats, trendData, projects, statusBreakdown, recentActivity }) {
  const [enabledProjects, setEnabledProjects] = useState(new Set());

  useEffect(() => {
    if (trendData?.projectMap) {
      setEnabledProjects(new Set(Object.keys(trendData.projectMap)));
    }
  }, [trendData?.projectMap]);

  const toggleProject = (pid) => {
    setEnabledProjects(prev => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid);
      else next.add(pid);
      return next;
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Stats row — asymmetric layout */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Featured stat: Projects (wider on lg) */}
          <div className="col-span-2 bg-white dark:bg-[#161B22] rounded-xl border border-neutral-200 dark:border-[#30363D] p-5 flex items-center gap-5">
            <div className="w-12 h-12 rounded-xl bg-[#4F46E5]/10 dark:bg-[#6366F1]/15 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-[#4F46E5] dark:text-[#818CF8]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-neutral-500 dark:text-[#8B949E]">Active Projects</p>
              <p className="text-3xl font-bold text-neutral-900 dark:text-[#E6EDF3] tabular-nums">{stats.totalProjects}</p>
            </div>
            <div className="hidden sm:flex items-center gap-4 text-sm text-neutral-500 dark:text-[#8B949E]">
              <div className="text-center">
                <span className="block text-lg font-semibold text-neutral-900 dark:text-[#E6EDF3] tabular-nums">{stats.totalUsers}</span>
                <span className="text-xs">users</span>
              </div>
            </div>
          </div>

          {/* Requests stat */}
          <div className="bg-white dark:bg-[#161B22] rounded-xl border border-neutral-200 dark:border-[#30363D] p-4">
            <p className="text-xs text-neutral-500 dark:text-[#8B949E] mb-1">Total Requests</p>
            <p className="text-2xl font-bold text-neutral-900 dark:text-[#E6EDF3] tabular-nums">{stats.totalRequests}</p>
            <div className="flex items-center gap-2 mt-1.5 text-[11px]">
              <span className="text-yellow-600 dark:text-yellow-400">{stats.pendingRequests} pending</span>
            </div>
          </div>

          {/* Completion stat with ring */}
          <div className="bg-white dark:bg-[#161B22] rounded-xl border border-neutral-200 dark:border-[#30363D] p-4 flex items-center gap-3">
            <div className="relative flex-shrink-0">
              <ProgressRing value={stats.completionRate} />
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-neutral-700 dark:text-[#E6EDF3]">
                {stats.completionRate}%
              </span>
            </div>
            <div>
              <p className="text-xs text-neutral-500 dark:text-[#8B949E]">Completion</p>
              <p className="text-sm font-semibold text-neutral-900 dark:text-[#E6EDF3]">{stats.completedRequests} done</p>
            </div>
          </div>
        </div>
      )}

      {/* Stacked request chart */}
      {trendData && (
        <div className="bg-white dark:bg-[#161B22] rounded-xl border border-neutral-200 dark:border-[#30363D] p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-[#E6EDF3]">Requests by Project (30 days)</h2>
          </div>
          {/* Project filter chips */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {Object.entries(trendData.projectMap).map(([pid, name], idx) => {
              const color = getProjectColor(idx);
              const enabled = enabledProjects.has(pid);
              return (
                <button
                  key={pid}
                  onClick={() => toggleProject(pid)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-full border transition-all ${
                    enabled
                      ? 'border-transparent text-white'
                      : 'border-neutral-200 dark:border-[#30363D] text-neutral-400 dark:text-[#484F58] bg-transparent'
                  }`}
                  style={enabled ? { backgroundColor: color } : {}}
                >
                  {name}
                </button>
              );
            })}
          </div>
          <StackedChart
            trends={trendData.trends}
            projectMap={trendData.projectMap}
            enabledProjects={enabledProjects}
          />
        </div>
      )}

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Quick project list — 3 cols */}
        <div className="lg:col-span-3 space-y-2">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-[#E6EDF3]">Projects</h2>
          {projects.map((project) => {
            const breakdown = statusBreakdown.find(b => b.project_id === project.id);
            return (
              <div key={project.id} className="bg-white dark:bg-[#161B22] rounded-xl border border-neutral-200 dark:border-[#30363D] p-4 hover:border-neutral-300 dark:hover:border-[#484F58] transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <h3 className="text-sm font-medium text-neutral-900 dark:text-[#E6EDF3] truncate">{project.name}</h3>
                    {project.slug === 'default' && (
                      <span className="text-[9px] px-1.5 py-0.5 bg-neutral-100 dark:bg-[#30363D] text-neutral-500 dark:text-[#8B949E] rounded-full flex-shrink-0">default</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-neutral-500 dark:text-[#8B949E] flex-shrink-0">
                    <span>{project.members} members</span>
                    <span>{project.requests} req</span>
                    <span className="text-green-600 dark:text-green-400 font-medium">{project.completionRate}%</span>
                  </div>
                </div>
                <StatusBar breakdown={breakdown} />
              </div>
            );
          })}
        </div>

        {/* Recent activity — 2 cols */}
        <div className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-[#E6EDF3] mb-2">Recent Activity</h2>
          <div className="bg-white dark:bg-[#161B22] rounded-xl border border-neutral-200 dark:border-[#30363D] p-4">
            {recentActivity.length === 0 ? (
              <p className="text-sm text-neutral-400 dark:text-[#6E7681] py-6 text-center">No recent activity</p>
            ) : (
              <div className="divide-y divide-neutral-100 dark:divide-[#21262D]">
                {recentActivity.slice(0, 10).map(a => (
                  <ActivityItem key={a.id} activity={a} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Projects View
// ═══════════════════════════════════════════════════════════════
function ProjectsView({ projects, statusBreakdown, membersByProject }) {
  const navigate = useNavigate();
  const { projects: userProjects } = useProject();
  const [expandedProjects, setExpandedProjects] = useState(new Set());

  const userProjectIds = useMemo(() => new Set(userProjects.map(p => p.id)), [userProjects]);

  const toggleProject = (id) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-neutral-900 dark:text-[#E6EDF3]">
          Projects ({projects.length})
        </h1>
        <Button size="sm" onClick={() => navigate('/onboarding')}>New Project</Button>
      </div>

      <div className="space-y-3">
        {projects.map((project) => {
          const breakdown = statusBreakdown.find(b => b.project_id === project.id);
          const members = membersByProject.find(m => m.project_id === project.id)?.members || [];
          const isExpanded = expandedProjects.has(project.id);
          const isMember = userProjectIds.has(project.id);
          const admins = members.filter(m => m.role === 'admin');

          return (
            <div key={project.id} className="bg-white dark:bg-[#161B22] rounded-xl border border-neutral-200 dark:border-[#30363D] overflow-hidden">
              {/* Collapsed header */}
              <button
                onClick={() => toggleProject(project.id)}
                className="w-full p-5 text-left hover:bg-neutral-50/50 dark:hover:bg-[#1C2128]/50 transition-colors"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-neutral-900 dark:text-[#E6EDF3] truncate">{project.name}</h3>
                      {project.slug === 'default' && (
                        <span className="text-[9px] px-1.5 py-0.5 bg-neutral-100 dark:bg-[#30363D] text-neutral-500 dark:text-[#8B949E] rounded-full flex-shrink-0">default</span>
                      )}
                    </div>
                    {project.description && (
                      <p className="text-xs text-neutral-500 dark:text-[#8B949E] line-clamp-1">{project.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-5 flex-shrink-0">
                    <div className="hidden sm:flex items-center gap-5 text-xs text-neutral-500 dark:text-[#8B949E]">
                      <span>{project.members} members</span>
                      <span>{project.requests} requests</span>
                      <span className="text-green-600 dark:text-green-400 font-medium">{project.completionRate}%</span>
                    </div>
                    <svg className={`w-4 h-4 text-neutral-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                {/* Mobile stats */}
                <div className="sm:hidden flex gap-4 mt-1.5 text-xs text-neutral-500 dark:text-[#8B949E]">
                  <span>{project.members} members</span>
                  <span>{project.requests} req</span>
                  <span className="text-green-600 dark:text-green-400">{project.completionRate}%</span>
                </div>
                {/* Inline status bar */}
                <div className="mt-3">
                  <StatusBar breakdown={breakdown} />
                </div>
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="border-t border-neutral-100 dark:border-[#21262D] p-5 space-y-5">
                  {/* Meta row */}
                  <div className="flex flex-wrap gap-4 text-xs text-neutral-500 dark:text-[#8B949E]">
                    <span>Created {new Date(project.created_at).toLocaleDateString()}</span>
                    {project.created_by_name && (
                      <span>by {project.created_by_name}</span>
                    )}
                  </div>

                  {/* Status legend */}
                  {breakdown && breakdown.total > 0 && (
                    <div className="flex flex-wrap gap-3">
                      {Object.entries(STATUS_COLORS).map(([status, color]) => {
                        const count = breakdown[status] || 0;
                        if (count === 0) return null;
                        return (
                          <div key={status} className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-[#8B949E]">
                            <div className={`w-2 h-2 rounded-full ${color}`} />
                            <span className="capitalize">{status.replace('_', ' ')}</span>
                            <span className="font-medium text-neutral-700 dark:text-[#E6EDF3]">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Admins row */}
                  {admins.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-neutral-500 dark:text-[#8B949E] mb-2">Admins</p>
                      <div className="flex flex-wrap gap-2">
                        {admins.map(a => (
                          <div key={a.id} className="flex items-center gap-2 px-2.5 py-1.5 bg-neutral-50 dark:bg-[#21262D] rounded-lg">
                            <Avatar name={a.name} size="xs" />
                            <span className="text-xs font-medium text-neutral-700 dark:text-[#E6EDF3]">{a.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Members table */}
                  {members.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-neutral-500 dark:text-[#8B949E] mb-2">Members ({members.length})</p>
                      <div className="space-y-1">
                        {members.map((member) => (
                          <div key={member.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-neutral-50 dark:hover:bg-[#21262D] transition-colors">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Avatar name={member.name} size="xs" />
                              <div className="min-w-0">
                                <p className="text-sm text-neutral-900 dark:text-[#E6EDF3] truncate">{member.name}</p>
                                <p className="text-xs text-neutral-400 dark:text-[#6E7681] truncate">{member.email}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                member.role === 'admin'
                                  ? 'bg-[#4F46E5]/10 dark:bg-[#6366F1]/15 text-[#4F46E5] dark:text-[#818CF8]'
                                  : 'bg-neutral-100 dark:bg-[#30363D] text-neutral-500 dark:text-[#8B949E]'
                              }`}>
                                {member.role}
                              </span>
                              <span className="text-xs text-neutral-400 dark:text-[#6E7681] tabular-nums">{member.request_count} req</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Enter project button */}
                  <div className="pt-2 flex items-center gap-3">
                    {isMember ? (
                      <Button
                        size="sm"
                        onClick={() => {
                          localStorage.setItem('selectedProjectId', String(project.id));
                          navigate('/dashboard');
                          window.location.reload();
                        }}
                      >
                        Enter Project
                      </Button>
                    ) : (
                      <span className="text-xs text-neutral-400 dark:text-[#6E7681] italic">You are not a member of this project</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Users View
// ═══════════════════════════════════════════════════════════════
function UsersView({ membersByProject, allProjects, onRefresh }) {
  const { user: currentUser } = useAuth();
  const [allUsers, setAllUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  // Add user modal
  const [showInvite, setShowInvite] = useState(false);
  const [authMethod, setAuthMethod] = useState('google');
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', password: '', role: 'employee', project_id: '' });
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');

  // Delete state
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deletingUserId, setDeletingUserId] = useState(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await usersApi.getAll();
      setAllUsers(data);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  // Build project membership map per user
  const userProjectMap = useMemo(() => {
    const map = {};
    for (const group of membersByProject) {
      for (const m of group.members) {
        if (!map[m.id]) map[m.id] = [];
        map[m.id].push({ name: group.project_name, role: m.role });
      }
    }
    return map;
  }, [membersByProject]);

  // Filter users
  useEffect(() => {
    let result = allUsers;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(u => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q));
    }
    if (roleFilter !== 'all') {
      result = result.filter(u => u.role === roleFilter);
    }
    setFilteredUsers(result);
  }, [allUsers, searchQuery, roleFilter]);

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviteError('');
    setInviting(true);
    try {
      const payload = {
        email: inviteForm.email,
        name: inviteForm.name,
        role: inviteForm.role,
        auth_method: authMethod,
      };
      if (authMethod === 'email') payload.password = inviteForm.password;
      if (inviteForm.project_id) payload.project_id = parseInt(inviteForm.project_id);

      await usersApi.invite(payload);
      await loadUsers();
      onRefresh?.();

      setShowInvite(false);
      setInviteForm({ name: '', email: '', password: '', role: 'employee', project_id: '' });
      setAuthMethod('google');
    } catch (err) {
      setInviteError(err.message || 'Failed to invite user');
    } finally {
      setInviting(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    setDeletingUserId(userId);
    try {
      await usersApi.delete(userId);
      setAllUsers(prev => prev.filter(u => u.id !== userId));
      setConfirmDeleteId(null);
      onRefresh?.();
    } catch (err) {
      console.error('Failed to delete user:', err);
    } finally {
      setDeletingUserId(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="h-8 w-32 bg-neutral-200 dark:bg-[#21262D] rounded animate-pulse mb-4" />
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-neutral-200 dark:bg-[#21262D] rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-neutral-900 dark:text-[#E6EDF3]">
          Users ({allUsers.length})
        </h1>
        <Button size="sm" onClick={() => setShowInvite(true)}>Invite User</Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users..."
            className="w-full pl-10 pr-3 py-2 text-sm bg-white dark:bg-[#161B22] border border-neutral-200 dark:border-[#30363D] rounded-lg text-neutral-900 dark:text-[#E6EDF3] placeholder-neutral-400 dark:placeholder-[#484F58] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30 dark:focus:ring-[#6366F1]/30 focus:border-[#4F46E5] dark:focus:border-[#6366F1]"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 text-sm bg-white dark:bg-[#161B22] border border-neutral-200 dark:border-[#30363D] rounded-lg text-neutral-700 dark:text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30"
        >
          <option value="all">All roles</option>
          <option value="super_admin">Super Admin</option>
          <option value="admin">Admin</option>
          <option value="employee">Employee</option>
        </select>
      </div>

      {/* User list */}
      <div className="bg-white dark:bg-[#161B22] rounded-xl border border-neutral-200 dark:border-[#30363D] overflow-hidden">
        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 dark:border-[#21262D]">
                <th className="text-left px-5 py-2.5 text-xs font-medium text-neutral-500 dark:text-[#8B949E]">User</th>
                <th className="text-left px-5 py-2.5 text-xs font-medium text-neutral-500 dark:text-[#8B949E]">Role</th>
                <th className="text-left px-5 py-2.5 text-xs font-medium text-neutral-500 dark:text-[#8B949E]">Projects</th>
                <th className="text-left px-5 py-2.5 text-xs font-medium text-neutral-500 dark:text-[#8B949E]">Joined</th>
                <th className="px-5 py-2.5 w-10" />
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => {
                const userProjects = userProjectMap[user.id] || [];
                return (
                  <tr key={user.id} className="border-b border-neutral-50 dark:border-[#161B22] last:border-0 hover:bg-neutral-50/50 dark:hover:bg-[#1C2128]/50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={user.name} src={user.profile_picture} size="sm" />
                        <div className="min-w-0">
                          <p className="text-neutral-900 dark:text-[#E6EDF3] font-medium truncate">{user.name}</p>
                          <p className="text-xs text-neutral-500 dark:text-[#8B949E] truncate">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        user.role === 'super_admin'
                          ? 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
                          : user.role === 'admin'
                          ? 'bg-[#4F46E5]/10 dark:bg-[#6366F1]/15 text-[#4F46E5] dark:text-[#818CF8]'
                          : 'bg-neutral-100 dark:bg-[#30363D] text-neutral-500 dark:text-[#8B949E]'
                      }`}>
                        {user.role === 'super_admin' ? 'super admin' : user.role}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1">
                        {userProjects.length === 0 && (
                          <span className="text-xs text-neutral-400 dark:text-[#484F58]">none</span>
                        )}
                        {userProjects.slice(0, 3).map((p, i) => (
                          <span key={i} className="text-[10px] px-1.5 py-0.5 bg-neutral-100 dark:bg-[#21262D] text-neutral-600 dark:text-[#8B949E] rounded">
                            {p.name}
                          </span>
                        ))}
                        {userProjects.length > 3 && (
                          <span className="text-[10px] text-neutral-400 dark:text-[#484F58]">+{userProjects.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-neutral-500 dark:text-[#8B949E] text-xs">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3">
                      {user.id !== currentUser?.id && (
                        confirmDeleteId === user.id ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              disabled={deletingUserId === user.id}
                              className="text-[11px] px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded font-medium transition-colors disabled:opacity-50"
                            >
                              {deletingUserId === user.id ? '...' : 'Confirm'}
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="text-[11px] px-2 py-1 text-neutral-500 dark:text-[#8B949E] hover:text-neutral-700 dark:hover:text-[#E6EDF3] transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(user.id)}
                            className="p-1.5 text-neutral-400 dark:text-[#484F58] hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-neutral-100 dark:hover:bg-[#21262D] transition-colors"
                            title="Delete user"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile card view */}
        <div className="sm:hidden divide-y divide-neutral-100 dark:divide-[#21262D]">
          {filteredUsers.map((user) => {
            const userProjects = userProjectMap[user.id] || [];
            return (
              <div key={user.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar name={user.name} src={user.profile_picture} size="sm" />
                    <div className="min-w-0">
                      <p className="font-medium text-neutral-900 dark:text-[#E6EDF3] truncate">{user.name}</p>
                      <p className="text-xs text-neutral-500 dark:text-[#8B949E] truncate">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      user.role === 'super_admin'
                        ? 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
                        : user.role === 'admin'
                        ? 'bg-[#4F46E5]/10 dark:bg-[#6366F1]/15 text-[#4F46E5] dark:text-[#818CF8]'
                        : 'bg-neutral-100 dark:bg-[#30363D] text-neutral-500 dark:text-[#8B949E]'
                    }`}>
                      {user.role === 'super_admin' ? 'super admin' : user.role}
                    </span>
                    {user.id !== currentUser?.id && (
                      confirmDeleteId === user.id ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleDeleteUser(user.id)} disabled={deletingUserId === user.id}
                            className="text-[11px] px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded font-medium transition-colors disabled:opacity-50">
                            {deletingUserId === user.id ? '...' : 'Yes'}
                          </button>
                          <button onClick={() => setConfirmDeleteId(null)}
                            className="text-[11px] px-2 py-1 text-neutral-500 dark:text-[#8B949E] transition-colors">No</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDeleteId(user.id)}
                          className="p-1 text-neutral-400 dark:text-[#484F58] hover:text-red-500 dark:hover:text-red-400 transition-colors" title="Delete user">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      )
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {userProjects.map((p, i) => (
                    <span key={i} className="text-[10px] px-1.5 py-0.5 bg-neutral-100 dark:bg-[#21262D] text-neutral-600 dark:text-[#8B949E] rounded">{p.name}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {filteredUsers.length === 0 && (
          <div className="py-12 text-center text-sm text-neutral-400 dark:text-[#6E7681]">
            No users found
          </div>
        )}
      </div>

      {/* Invite User Modal */}
      <Modal
        isOpen={showInvite}
        onClose={() => { setShowInvite(false); setInviteError(''); setInviteForm({ name: '', email: '', password: '', role: 'employee', project_id: '' }); setAuthMethod('google'); }}
        title="Invite User"
        size="md"
      >
        <form onSubmit={handleInvite} className="space-y-4">
          {inviteError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
              {inviteError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Sign-in Method</label>
            <div className="flex p-1 bg-neutral-100 dark:bg-[#21262D] rounded-lg">
              <button type="button" onClick={() => setAuthMethod('google')}
                className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${authMethod === 'google' ? 'bg-white dark:bg-[#161B22] text-neutral-900 dark:text-[#E6EDF3] shadow-sm' : 'text-neutral-500 dark:text-[#8B949E]'}`}>
                Google SSO
              </button>
              <button type="button" onClick={() => setAuthMethod('email')}
                className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${authMethod === 'email' ? 'bg-white dark:bg-[#161B22] text-neutral-900 dark:text-[#E6EDF3] shadow-sm' : 'text-neutral-500 dark:text-[#8B949E]'}`}>
                Email + Password
              </button>
            </div>
          </div>

          <Input label="Full Name" value={inviteForm.name} onChange={(e) => setInviteForm(prev => ({ ...prev, name: e.target.value }))} placeholder="Jane Smith" required />
          <Input label="Email" type="email" value={inviteForm.email} onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))} placeholder="user@company.com" required />

          {authMethod === 'email' && (
            <div>
              <Input label="Temporary Password" type="password" value={inviteForm.password} onChange={(e) => setInviteForm(prev => ({ ...prev, password: e.target.value }))} placeholder="Minimum 6 characters" required />
              <p className="text-xs text-neutral-400 dark:text-[#6E7681] mt-1">User must change this on first login.</p>
            </div>
          )}

          {authMethod === 'google' && (
            <p className="text-xs text-neutral-400 dark:text-[#6E7681] p-3 bg-neutral-50 dark:bg-[#21262D] rounded-lg">
              User will sign in with their Google account. Their account will be linked automatically on first login.
            </p>
          )}

          <Select
            label="Role"
            value={inviteForm.role}
            onChange={(e) => setInviteForm(prev => ({ ...prev, role: e.target.value }))}
            options={[
              { value: 'employee', label: 'Employee' },
              { value: 'admin', label: 'Admin' },
            ]}
          />

          <Select
            label="Assign to Project (optional)"
            value={inviteForm.project_id}
            onChange={(e) => setInviteForm(prev => ({ ...prev, project_id: e.target.value }))}
            options={[
              { value: '', label: 'No project assignment' },
              ...allProjects.map(p => ({ value: String(p.id), label: p.name })),
            ]}
          />

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" className="w-full sm:w-auto"
              onClick={() => { setShowInvite(false); setInviteError(''); setInviteForm({ name: '', email: '', password: '', role: 'employee', project_id: '' }); setAuthMethod('google'); }}>
              Cancel
            </Button>
            <Button type="submit" disabled={inviting} className="w-full sm:w-auto">
              {inviting ? <span className="flex items-center gap-2"><Spinner size="sm" />Inviting...</span> : 'Send Invite'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Activity View
// ═══════════════════════════════════════════════════════════════
function ActivityView({ initialActivity, projectMap }) {
  const [activity, setActivity] = useState(initialActivity || []);
  const [filterProject, setFilterProject] = useState('all');
  const [loading, setLoading] = useState(false);
  const [limit, setLimit] = useState(20);

  const loadMore = async () => {
    setLoading(true);
    try {
      const data = await superAdmin.getActivity(limit + 20);
      setActivity(data);
      setLimit(limit + 20);
    } catch (err) {
      console.error('Failed to load more activity:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setActivity(initialActivity || []);
  }, [initialActivity]);

  const filtered = filterProject === 'all'
    ? activity
    : activity.filter(a => String(a.project_id) === filterProject);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-neutral-900 dark:text-[#E6EDF3]">Activity Feed</h1>
        <select
          value={filterProject}
          onChange={(e) => setFilterProject(e.target.value)}
          className="px-3 py-2 text-sm bg-white dark:bg-[#161B22] border border-neutral-200 dark:border-[#30363D] rounded-lg text-neutral-700 dark:text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30"
        >
          <option value="all">All projects</option>
          {Object.entries(projectMap).map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>
      </div>

      <div className="bg-white dark:bg-[#161B22] rounded-xl border border-neutral-200 dark:border-[#30363D] p-5">
        {filtered.length === 0 ? (
          <p className="text-sm text-neutral-400 dark:text-[#6E7681] py-12 text-center">No activity found</p>
        ) : (
          <>
            <div className="divide-y divide-neutral-100 dark:divide-[#21262D]">
              {filtered.map(a => (
                <ActivityItem key={a.id} activity={a} />
              ))}
            </div>
            {filtered.length >= limit && (
              <div className="pt-4 text-center">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="text-sm text-[#4F46E5] dark:text-[#818CF8] hover:underline disabled:opacity-50"
                >
                  {loading ? 'Loading...' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Main Dashboard Component
// ═══════════════════════════════════════════════════════════════
export function SuperAdminDashboard() {
  const [searchParams] = useSearchParams();
  const view = searchParams.get('view') || 'overview';

  const [stats, setStats] = useState(null);
  const [projects, setProjects] = useState([]);
  const [trendData, setTrendData] = useState(null);
  const [statusBreakdown, setStatusBreakdown] = useState([]);
  const [membersByProject, setMembersByProject] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsData, projectsData, trendByProjectData, breakdownData, membersData, activityData, allProjectsData] = await Promise.all([
        superAdmin.getStats(),
        superAdmin.getProjects(),
        superAdmin.getTrendsByProject(30),
        superAdmin.getStatusBreakdown(),
        superAdmin.getMembersByProject(),
        superAdmin.getActivity(20),
        projectsApi.getAll(),
      ]);
      setStats(statsData);
      setProjects(projectsData);
      setTrendData(trendByProjectData);
      setStatusBreakdown(breakdownData);
      setMembersByProject(membersData);
      setRecentActivity(activityData);
      setAllProjects(allProjectsData);
    } catch (err) {
      console.error('Failed to load super admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Build project map from projects list for activity filter
  const projectMap = useMemo(() => {
    const map = {};
    for (const p of projects) {
      map[String(p.id)] = p.name;
    }
    return map;
  }, [projects]);

  if (loading) {
    return (
      <Layout>
        <div className="max-w-6xl mx-auto animate-pulse space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="col-span-2 h-24 bg-neutral-200 dark:bg-[#21262D] rounded-xl" />
            <div className="h-24 bg-neutral-200 dark:bg-[#21262D] rounded-xl" />
            <div className="h-24 bg-neutral-200 dark:bg-[#21262D] rounded-xl" />
          </div>
          <div className="h-56 bg-neutral-200 dark:bg-[#21262D] rounded-xl" />
          <div className="grid lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 h-48 bg-neutral-200 dark:bg-[#21262D] rounded-xl" />
            <div className="lg:col-span-2 h-48 bg-neutral-200 dark:bg-[#21262D] rounded-xl" />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {view === 'overview' && (
        <OverviewView
          stats={stats}
          trendData={trendData}
          projects={projects}
          statusBreakdown={statusBreakdown}
          recentActivity={recentActivity}
        />
      )}
      {view === 'projects' && (
        <ProjectsView
          projects={projects}
          statusBreakdown={statusBreakdown}
          membersByProject={membersByProject}
        />
      )}
      {view === 'users' && (
        <UsersView
          membersByProject={membersByProject}
          allProjects={allProjects}
          onRefresh={loadData}
        />
      )}
      {view === 'activity' && (
        <ActivityView
          initialActivity={recentActivity}
          projectMap={projectMap}
        />
      )}
    </Layout>
  );
}
