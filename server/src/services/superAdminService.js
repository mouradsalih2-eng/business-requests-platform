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

      // Get creator name
      let created_by_name = null;
      if (project.created_by) {
        const { data: creator } = await supabase
          .from('users')
          .select('name')
          .eq('id', project.created_by)
          .single();
        created_by_name = creator?.name || null;
      }

      return {
        id: project.id,
        name: project.name,
        slug: project.slug,
        description: project.description,
        icon: project.icon,
        created_at: project.created_at,
        created_by: project.created_by,
        created_by_name,
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
   * Get members by project with request counts.
   */
  async getMembersByProject() {
    const projects = await projectRepository.findAll();
    const results = [];

    for (const project of projects) {
      // Get project members with user details
      const { data: members, error: membersError } = await supabase
        .from('project_members')
        .select('role, joined_at, users(id, name, email)')
        .eq('project_id', project.id);
      if (membersError) handleError(membersError, 'getMembersByProject.members');

      // Get request counts per user in this project
      const { data: requestCounts, error: rcError } = await supabase
        .from('requests')
        .select('user_id')
        .eq('project_id', project.id);
      if (rcError) handleError(rcError, 'getMembersByProject.requests');

      const countMap = {};
      for (const r of requestCounts) {
        countMap[r.user_id] = (countMap[r.user_id] || 0) + 1;
      }

      results.push({
        project_id: project.id,
        project_name: project.name,
        members: (members || []).map(m => ({
          id: m.users?.id,
          name: m.users?.name,
          email: m.users?.email,
          role: m.role,
          request_count: countMap[m.users?.id] || 0,
          joined_at: m.joined_at,
        })),
      });
    }

    return results;
  },

  /**
   * Get per-project trends for stacked chart.
   */
  async getTrendsByProject(days = 30) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const { data, error } = await supabase
      .from('requests')
      .select('id, created_at, project_id')
      .gte('created_at', startDate.toISOString())
      .order('created_at');
    if (error) handleError(error, 'getTrendsByProject');

    // Get all projects for legend
    const projects = await projectRepository.findAll();
    const projectMap = {};
    for (const p of projects) {
      projectMap[String(p.id)] = p.name;
    }

    // Group by day and project
    const grouped = {};
    for (const r of data) {
      const day = r.created_at.split('T')[0];
      if (!grouped[day]) grouped[day] = {};
      const pid = String(r.project_id);
      grouped[day][pid] = (grouped[day][pid] || 0) + 1;
    }

    // Fill in missing days
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split('T')[0];
      result.push({ date: key, projects: grouped[key] || {} });
    }

    return { trends: result, projectMap };
  },

  /**
   * Get recent cross-project activity feed.
   */
  async getRecentActivity(limit = 20) {
    const { data, error } = await supabase
      .from('activity_log')
      .select('id, action, old_value, new_value, created_at, user_id, project_id, request_id')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) handleError(error, 'getRecentActivity');

    // Enrich with user and project names
    const userIds = [...new Set(data.map(a => a.user_id).filter(Boolean))];
    const projectIds = [...new Set(data.map(a => a.project_id).filter(Boolean))];

    const userMap = {};
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, name')
        .in('id', userIds);
      for (const u of (users || [])) userMap[u.id] = u.name;
    }

    const projectNameMap = {};
    if (projectIds.length > 0) {
      const { data: projects } = await supabase
        .from('projects')
        .select('id, name')
        .in('id', projectIds);
      for (const p of (projects || [])) projectNameMap[p.id] = p.name;
    }

    return data.map(a => ({
      id: a.id,
      action: a.action,
      old_value: a.old_value,
      new_value: a.new_value,
      user_name: userMap[a.user_id] || 'Unknown',
      project_name: projectNameMap[a.project_id] || 'Unknown',
      project_id: a.project_id,
      request_id: a.request_id,
      created_at: a.created_at,
    }));
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
