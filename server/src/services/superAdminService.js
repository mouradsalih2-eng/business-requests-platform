import { supabase } from '../db/supabase.js';
import { projectRepository } from '../repositories/projectRepository.js';
import { AppError } from '../errors/AppError.js';

function handleError(error, context) {
  console.error(`superAdminService.${context}:`, error.message);
  throw new AppError(`Database error in ${context}`, 500);
}

export const superAdminService = {
  /**
   * Get overview stats for all projects.
   */
  async getProjectOverviews() {
    const projects = await projectRepository.findAll();

    const overviews = await Promise.all(projects.map(async (project) => {
      const stats = await projectRepository.getStats(project.id);
      return {
        id: project.id,
        name: project.name,
        slug: project.slug,
        description: project.description,
        created_at: project.created_at,
        ...stats,
      };
    }));

    return overviews;
  },

  /**
   * Get global stats across all projects.
   */
  async getGlobalStats() {
    const { count: totalProjects, error: e1 } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true });
    if (e1) handleError(e1, 'getGlobalStats.projects');

    const { count: totalUsers, error: e2 } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    if (e2) handleError(e2, 'getGlobalStats.users');

    const { count: totalRequests, error: e3 } = await supabase
      .from('requests')
      .select('*', { count: 'exact', head: true });
    if (e3) handleError(e3, 'getGlobalStats.requests');

    const { count: completedRequests, error: e4 } = await supabase
      .from('requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed');
    if (e4) handleError(e4, 'getGlobalStats.completed');

    const { count: pendingRequests, error: e5 } = await supabase
      .from('requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    if (e5) handleError(e5, 'getGlobalStats.pending');

    return {
      totalProjects: totalProjects || 0,
      totalUsers: totalUsers || 0,
      totalRequests: totalRequests || 0,
      completedRequests: completedRequests || 0,
      pendingRequests: pendingRequests || 0,
      completionRate: totalRequests
        ? Math.round((completedRequests / totalRequests) * 100)
        : 0,
    };
  },

  /**
   * Get cross-project trend data for charts.
   */
  async getCrossProjectTrends(days = 30) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const { data, error } = await supabase
      .from('requests')
      .select('id, created_at, status, project_id, projects!project_id(name)')
      .gte('created_at', startDate.toISOString())
      .order('created_at');
    if (error) handleError(error, 'getCrossProjectTrends');

    // Group by day
    const grouped = {};
    for (const r of data) {
      const day = r.created_at.split('T')[0];
      if (!grouped[day]) grouped[day] = { date: day, total: 0, completed: 0, pending: 0 };
      grouped[day].total++;
      if (r.status === 'completed') grouped[day].completed++;
      if (r.status === 'pending') grouped[day].pending++;
    }

    // Fill in missing days
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split('T')[0];
      result.push(grouped[key] || { date: key, total: 0, completed: 0, pending: 0 });
    }

    return result;
  },

  /**
   * Get status breakdown per project.
   */
  async getStatusBreakdown() {
    const projects = await projectRepository.findAll();
    const results = [];

    for (const project of projects) {
      const { data, error } = await supabase
        .from('requests')
        .select('status')
        .eq('project_id', project.id);
      if (error) handleError(error, 'getStatusBreakdown');

      const breakdown = { pending: 0, backlog: 0, in_progress: 0, completed: 0, rejected: 0 };
      for (const r of data) {
        if (breakdown[r.status] !== undefined) breakdown[r.status]++;
      }

      results.push({
        project_id: project.id,
        project_name: project.name,
        ...breakdown,
        total: data.length,
      });
    }

    return results;
  },
};
