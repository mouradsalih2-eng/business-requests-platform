import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { superAdmin } from '../lib/api';

const STAT_CARDS = [
  { key: 'totalProjects', label: 'Projects', color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' },
  { key: 'totalUsers', label: 'Users', color: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300' },
  { key: 'totalRequests', label: 'Requests', color: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' },
  { key: 'completionRate', label: 'Completion', suffix: '%', color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300' },
];

export function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [projects, setProjects] = useState([]);
  const [trends, setTrends] = useState([]);
  const [statusBreakdown, setStatusBreakdown] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsData, projectsData, trendsData, breakdownData] = await Promise.all([
        superAdmin.getStats(),
        superAdmin.getProjects(),
        superAdmin.getTrends(30),
        superAdmin.getStatusBreakdown(),
      ]);
      setStats(statsData);
      setProjects(projectsData);
      setTrends(trendsData);
      setStatusBreakdown(breakdownData);
    } catch (err) {
      console.error('Failed to load super admin data:', err);
    } finally {
      setLoading(false);
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

        {/* Project Cards Grid */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-[#E6EDF3] mb-3">Projects</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <div key={project.id} className="bg-white dark:bg-[#161B22] rounded-xl border border-neutral-200 dark:border-[#30363D] p-5 hover:border-[#4F46E5]/30 dark:hover:border-[#6366F1]/30 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-900 dark:text-[#E6EDF3]">{project.name}</h3>
                    {project.description && (
                      <p className="text-xs text-neutral-500 dark:text-[#8B949E] mt-0.5 line-clamp-2">{project.description}</p>
                    )}
                  </div>
                  {project.slug === 'default' && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-neutral-100 dark:bg-[#30363D] text-neutral-500 dark:text-[#8B949E] rounded-full">default</span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-xs text-neutral-500 dark:text-[#8B949E]">Members</p>
                    <p className="text-lg font-semibold text-neutral-900 dark:text-[#E6EDF3]">{project.members}</p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500 dark:text-[#8B949E]">Requests</p>
                    <p className="text-lg font-semibold text-neutral-900 dark:text-[#E6EDF3]">{project.requests}</p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500 dark:text-[#8B949E]">Done</p>
                    <p className="text-lg font-semibold text-green-600 dark:text-green-400">{project.completionRate}%</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="bg-white dark:bg-[#161B22] rounded-xl border border-neutral-200 dark:border-[#30363D] p-5">
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
      </div>
    </Layout>
  );
}
