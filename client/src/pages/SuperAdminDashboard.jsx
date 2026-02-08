import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Spinner } from '../components/ui/Spinner';
import { superAdmin, users as usersApi, projects as projectsApi } from '../lib/api';

const STAT_CARDS = [
  { key: 'totalProjects', label: 'Projects', color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' },
  { key: 'totalUsers', label: 'Users', color: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300' },
  { key: 'totalRequests', label: 'Requests', color: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' },
  { key: 'completionRate', label: 'Completion', suffix: '%', color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300' },
];

const STATUS_COLORS = {
  pending: 'bg-yellow-500',
  backlog: 'bg-neutral-400',
  in_progress: 'bg-blue-500',
  completed: 'bg-green-500',
  rejected: 'bg-red-500',
};

export function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [projects, setProjects] = useState([]);
  const [trends, setTrends] = useState([]);
  const [statusBreakdown, setStatusBreakdown] = useState([]);
  const [membersByProject, setMembersByProject] = useState([]);
  const [adminsList, setAdminsList] = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Expanded project cards
  const [expandedProjects, setExpandedProjects] = useState(new Set());

  // Add Admin modal state
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [authMethod, setAuthMethod] = useState('google');
  const [adminForm, setAdminForm] = useState({ name: '', email: '', password: '', project_id: '' });
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [addAdminError, setAddAdminError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsData, projectsData, trendsData, breakdownData, membersData, adminsData, allProjectsData] = await Promise.all([
        superAdmin.getStats(),
        superAdmin.getProjects(),
        superAdmin.getTrends(30),
        superAdmin.getStatusBreakdown(),
        superAdmin.getMembersByProject(),
        usersApi.getAdmins(),
        projectsApi.getAll(),
      ]);
      setStats(statsData);
      setProjects(projectsData);
      setTrends(trendsData);
      setStatusBreakdown(breakdownData);
      setMembersByProject(membersData);
      setAdminsList(adminsData);
      setAllProjects(allProjectsData);
    } catch (err) {
      console.error('Failed to load super admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleProject = (projectId) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  };

  const handleAddAdmin = async (e) => {
    e.preventDefault();
    setAddAdminError('');
    setAddingAdmin(true);

    try {
      const payload = {
        email: adminForm.email,
        name: adminForm.name,
        role: 'admin',
        auth_method: authMethod,
      };
      if (authMethod === 'email') payload.password = adminForm.password;
      if (adminForm.project_id) payload.project_id = parseInt(adminForm.project_id);

      await usersApi.invite(payload);

      // Refresh admins list
      const adminsData = await usersApi.getAdmins();
      setAdminsList(adminsData);

      setShowAddAdmin(false);
      setAdminForm({ name: '', email: '', password: '', project_id: '' });
      setAuthMethod('google');
    } catch (err) {
      setAddAdminError(err.message || 'Failed to create admin');
    } finally {
      setAddingAdmin(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-6xl mx-auto animate-pulse space-y-6">
          <div className="h-8 w-48 bg-neutral-200 dark:bg-[#21262D] rounded" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-neutral-200 dark:bg-[#21262D] rounded-xl" />
            ))}
          </div>
          <div className="h-64 bg-neutral-200 dark:bg-[#21262D] rounded-xl" />
        </div>
      </Layout>
    );
  }

  const maxTrend = Math.max(...trends.map(t => t.total), 1);

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Super Admin Dashboard</h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Cross-project overview</p>
          </div>
        </div>

        {/* Global Stats Row */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {STAT_CARDS.map(({ key, label, suffix, color }) => (
              <div key={key} className={`rounded-xl border border-neutral-200 dark:border-[#30363D] p-5 ${color}`}>
                <p className="text-xs font-medium opacity-75 mb-1">{label}</p>
                <p className="text-2xl font-bold">{stats[key]}{suffix || ''}</p>
              </div>
            ))}
          </div>
        )}

        {/* Cross-Project Trend Chart */}
        <div className="bg-white dark:bg-[#161B22] rounded-xl border border-neutral-200 dark:border-[#30363D] p-5 mb-6">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-[#E6EDF3] mb-4">Request Trend (30 days)</h2>
          <div className="flex items-end gap-[2px] h-32">
            {trends.map((t, i) => (
              <div
                key={i}
                className="flex-1 bg-[#4F46E5]/20 dark:bg-[#6366F1]/30 hover:bg-[#4F46E5]/40 dark:hover:bg-[#6366F1]/50 rounded-t transition-colors relative group"
                style={{ height: `${(t.total / maxTrend) * 100}%`, minHeight: t.total > 0 ? '4px' : '0' }}
                title={`${t.date}: ${t.total} requests`}
              >
                {t.total > 0 && (
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    {t.total}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-neutral-400 dark:text-[#484F58]">
            <span>{trends[0]?.date}</span>
            <span>{trends[trends.length - 1]?.date}</span>
          </div>
        </div>

        {/* Per-Project Insights (expandable) */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-[#E6EDF3] mb-3">Projects</h2>
          <div className="space-y-3">
            {projects.map((project) => {
              const breakdown = statusBreakdown.find(b => b.project_id === project.id);
              const members = membersByProject.find(m => m.project_id === project.id)?.members || [];
              const isExpanded = expandedProjects.has(project.id);

              return (
                <div key={project.id} className="bg-white dark:bg-[#161B22] rounded-xl border border-neutral-200 dark:border-[#30363D] overflow-hidden">
                  {/* Project header - clickable */}
                  <button
                    onClick={() => toggleProject(project.id)}
                    className="w-full p-5 text-left hover:bg-neutral-50 dark:hover:bg-[#1C2128] transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-neutral-900 dark:text-[#E6EDF3]">{project.name}</h3>
                            {project.slug === 'default' && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-neutral-100 dark:bg-[#30363D] text-neutral-500 dark:text-[#8B949E] rounded-full">default</span>
                            )}
                          </div>
                          {project.description && (
                            <p className="text-xs text-neutral-500 dark:text-[#8B949E] mt-0.5">{project.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="hidden sm:flex items-center gap-6 text-sm">
                          <div className="text-center">
                            <span className="font-semibold text-neutral-900 dark:text-[#E6EDF3]">{project.members}</span>
                            <span className="text-neutral-400 dark:text-[#8B949E] ml-1">members</span>
                          </div>
                          <div className="text-center">
                            <span className="font-semibold text-neutral-900 dark:text-[#E6EDF3]">{project.requests}</span>
                            <span className="text-neutral-400 dark:text-[#8B949E] ml-1">requests</span>
                          </div>
                          <div className="text-center">
                            <span className="font-semibold text-green-600 dark:text-green-400">{project.completionRate}%</span>
                            <span className="text-neutral-400 dark:text-[#8B949E] ml-1">done</span>
                          </div>
                        </div>
                        <svg className={`w-4 h-4 text-neutral-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                    {/* Mobile stats */}
                    <div className="sm:hidden flex gap-4 mt-2 text-xs">
                      <span className="text-neutral-500 dark:text-[#8B949E]">{project.members} members</span>
                      <span className="text-neutral-500 dark:text-[#8B949E]">{project.requests} requests</span>
                      <span className="text-green-600 dark:text-green-400">{project.completionRate}% done</span>
                    </div>
                  </button>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="border-t border-neutral-100 dark:border-[#21262D] p-5 space-y-5">
                      {/* Status breakdown bar */}
                      {breakdown && breakdown.total > 0 && (
                        <div>
                          <p className="text-xs font-medium text-neutral-500 dark:text-[#8B949E] mb-2">Request Status</p>
                          <div className="flex h-2 rounded-full overflow-hidden bg-neutral-100 dark:bg-[#30363D]">
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
                          <div className="flex flex-wrap gap-3 mt-2">
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
                        </div>
                      )}

                      {/* Members list */}
                      {members.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-neutral-500 dark:text-[#8B949E] mb-2">Members</p>
                          <div className="space-y-2">
                            {members.map((member) => (
                              <div key={member.id} className="flex items-center justify-between py-1.5">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="w-7 h-7 rounded-full bg-neutral-100 dark:bg-[#30363D] flex items-center justify-center text-xs font-medium text-neutral-600 dark:text-[#8B949E] flex-shrink-0">
                                    {member.name?.charAt(0)?.toUpperCase() || '?'}
                                  </div>
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
                                  <span className="text-xs text-neutral-400 dark:text-[#6E7681]">{member.request_count} req</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {members.length === 0 && (!breakdown || breakdown.total === 0) && (
                        <p className="text-sm text-neutral-400 dark:text-[#6E7681]">No members or requests yet.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Status Breakdown Table */}
        <div className="bg-white dark:bg-[#161B22] rounded-xl border border-neutral-200 dark:border-[#30363D] p-5 mb-6">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-[#E6EDF3] mb-4">Status Breakdown by Project</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 dark:border-[#21262D]">
                  <th className="text-left py-2 pr-4 text-xs font-medium text-neutral-500 dark:text-[#8B949E]">Project</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-neutral-500 dark:text-[#8B949E]">Pending</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-neutral-500 dark:text-[#8B949E]">Backlog</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-neutral-500 dark:text-[#8B949E]">In Progress</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-neutral-500 dark:text-[#8B949E]">Completed</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-neutral-500 dark:text-[#8B949E]">Rejected</th>
                  <th className="text-right py-2 pl-3 text-xs font-medium text-neutral-500 dark:text-[#8B949E]">Total</th>
                </tr>
              </thead>
              <tbody>
                {statusBreakdown.map((row) => (
                  <tr key={row.project_id} className="border-b border-neutral-50 dark:border-[#161B22] last:border-0">
                    <td className="py-2.5 pr-4 text-neutral-900 dark:text-[#E6EDF3] font-medium">{row.project_name}</td>
                    <td className="py-2.5 px-3 text-right text-yellow-600 dark:text-yellow-400">{row.pending}</td>
                    <td className="py-2.5 px-3 text-right text-neutral-500 dark:text-[#8B949E]">{row.backlog}</td>
                    <td className="py-2.5 px-3 text-right text-blue-600 dark:text-blue-400">{row.in_progress}</td>
                    <td className="py-2.5 px-3 text-right text-green-600 dark:text-green-400">{row.completed}</td>
                    <td className="py-2.5 px-3 text-right text-red-500 dark:text-red-400">{row.rejected}</td>
                    <td className="py-2.5 pl-3 text-right font-semibold text-neutral-900 dark:text-[#E6EDF3]">{row.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Admin Users */}
        <div className="bg-white dark:bg-[#161B22] rounded-xl border border-neutral-200 dark:border-[#30363D] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-[#21262D]">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-[#E6EDF3]">Admin Users ({adminsList.length})</h2>
            <Button size="sm" onClick={() => setShowAddAdmin(true)}>
              Add Admin
            </Button>
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 dark:border-[#21262D]">
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-neutral-500 dark:text-[#8B949E]">Name</th>
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-neutral-500 dark:text-[#8B949E]">Email</th>
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-neutral-500 dark:text-[#8B949E]">Role</th>
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-neutral-500 dark:text-[#8B949E]">Joined</th>
                </tr>
              </thead>
              <tbody>
                {adminsList.map((admin) => (
                  <tr key={admin.id} className="border-b border-neutral-50 dark:border-[#161B22] last:border-0 hover:bg-neutral-50 dark:hover:bg-[#1C2128] transition-colors">
                    <td className="px-5 py-3 text-neutral-900 dark:text-[#E6EDF3] font-medium">{admin.name}</td>
                    <td className="px-5 py-3 text-neutral-500 dark:text-[#8B949E]">{admin.email}</td>
                    <td className="px-5 py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        admin.role === 'super_admin'
                          ? 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
                          : 'bg-[#4F46E5]/10 dark:bg-[#6366F1]/15 text-[#4F46E5] dark:text-[#818CF8]'
                      }`}>
                        {admin.role === 'super_admin' ? 'super admin' : 'admin'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-neutral-500 dark:text-[#8B949E]">
                      {new Date(admin.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card view */}
          <div className="sm:hidden divide-y divide-neutral-100 dark:divide-[#21262D]">
            {adminsList.map((admin) => (
              <div key={admin.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-neutral-900 dark:text-[#E6EDF3] truncate">{admin.name}</p>
                    <p className="text-xs text-neutral-500 dark:text-[#8B949E] truncate">{admin.email}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ml-2 ${
                    admin.role === 'super_admin'
                      ? 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
                      : 'bg-[#4F46E5]/10 dark:bg-[#6366F1]/15 text-[#4F46E5] dark:text-[#818CF8]'
                  }`}>
                    {admin.role === 'super_admin' ? 'super admin' : 'admin'}
                  </span>
                </div>
                <p className="text-xs text-neutral-400 dark:text-[#6E7681] mt-1">
                  Joined {new Date(admin.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Admin Modal */}
      <Modal
        isOpen={showAddAdmin}
        onClose={() => {
          setShowAddAdmin(false);
          setAddAdminError('');
          setAdminForm({ name: '', email: '', password: '', project_id: '' });
          setAuthMethod('google');
        }}
        title="Add Admin"
        size="md"
      >
        <form onSubmit={handleAddAdmin} className="space-y-4">
          {addAdminError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
              {addAdminError}
            </div>
          )}

          {/* Auth method toggle */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Sign-in Method</label>
            <div className="flex p-1 bg-neutral-100 dark:bg-[#21262D] rounded-lg">
              <button
                type="button"
                onClick={() => setAuthMethod('google')}
                className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                  authMethod === 'google'
                    ? 'bg-white dark:bg-[#161B22] text-neutral-900 dark:text-[#E6EDF3] shadow-sm'
                    : 'text-neutral-500 dark:text-[#8B949E] hover:text-neutral-700 dark:hover:text-[#E6EDF3]'
                }`}
              >
                Google SSO
              </button>
              <button
                type="button"
                onClick={() => setAuthMethod('email')}
                className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                  authMethod === 'email'
                    ? 'bg-white dark:bg-[#161B22] text-neutral-900 dark:text-[#E6EDF3] shadow-sm'
                    : 'text-neutral-500 dark:text-[#8B949E] hover:text-neutral-700 dark:hover:text-[#E6EDF3]'
                }`}
              >
                Email + Password
              </button>
            </div>
          </div>

          <Input
            label="Full Name"
            value={adminForm.name}
            onChange={(e) => setAdminForm(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Jane Smith"
            required
          />

          <Input
            label="Email"
            type="email"
            value={adminForm.email}
            onChange={(e) => setAdminForm(prev => ({ ...prev, email: e.target.value }))}
            placeholder="admin@company.com"
            required
          />

          {authMethod === 'email' && (
            <div>
              <Input
                label="Temporary Password"
                type="password"
                value={adminForm.password}
                onChange={(e) => setAdminForm(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Minimum 6 characters"
                required
              />
              <p className="text-xs text-neutral-400 dark:text-[#6E7681] mt-1">Admin must change this on first login.</p>
            </div>
          )}

          {authMethod === 'google' && (
            <p className="text-xs text-neutral-400 dark:text-[#6E7681] p-3 bg-neutral-50 dark:bg-[#21262D] rounded-lg">
              Admin will sign in with their Google account. Their account will be linked automatically on first login.
            </p>
          )}

          {/* Project assignment */}
          <Select
            label="Assign to Project (optional)"
            value={adminForm.project_id}
            onChange={(e) => setAdminForm(prev => ({ ...prev, project_id: e.target.value }))}
            options={[
              { value: '', label: 'Let them create their own' },
              ...allProjects.map(p => ({ value: String(p.id), label: p.name })),
            ]}
          />

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={() => {
                setShowAddAdmin(false);
                setAddAdminError('');
                setAdminForm({ name: '', email: '', password: '', project_id: '' });
                setAuthMethod('google');
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={addingAdmin} className="w-full sm:w-auto">
              {addingAdmin ? (
                <span className="flex items-center gap-2">
                  <Spinner size="sm" />
                  Creating...
                </span>
              ) : (
                'Create Admin'
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
}
