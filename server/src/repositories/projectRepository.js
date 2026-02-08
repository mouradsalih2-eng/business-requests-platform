import { supabase } from '../db/supabase.js';
import { AppError, NotFoundError } from '../errors/AppError.js';

function handleError(error, context) {
  console.error(`projectRepository.${context}:`, error.message);
  throw new AppError(`Database error in ${context}`, 500);
}

export const projectRepository = {
  async findAll() {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at');
    if (error) handleError(error, 'findAll');
    return data;
  },

  async findById(id) {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) handleError(error, 'findById');
    return data;
  },

  async findByIdOrFail(id) {
    const project = await this.findById(id);
    if (!project) throw new NotFoundError('Project');
    return project;
  },

  async findBySlug(slug) {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();
    if (error) handleError(error, 'findBySlug');
    return data;
  },

  async findByUser(userId) {
    const { data, error } = await supabase
      .from('project_members')
      .select('project_id, role, projects(*)')
      .eq('user_id', userId)
      .order('joined_at');
    if (error) handleError(error, 'findByUser');
    return data.map(pm => ({
      ...pm.projects,
      memberRole: pm.role,
    }));
  },

  async create({ name, slug, description, icon, logo_url, created_by }) {
    const { data, error } = await supabase
      .from('projects')
      .insert({ name, slug, description, icon, logo_url, created_by })
      .select('*')
      .single();
    if (error) {
      if (error.code === '23505') throw new AppError('A project with this slug already exists', 400);
      handleError(error, 'create');
    }
    return data;
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('projects')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();
    if (error) handleError(error, 'update');
    return data;
  },

  async delete(id) {
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) handleError(error, 'delete');
  },

  async getStats(projectId) {
    const { count: memberCount, error: e1 } = await supabase
      .from('project_members')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId);
    if (e1) handleError(e1, 'getStats.members');

    const { count: requestCount, error: e2 } = await supabase
      .from('requests')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId);
    if (e2) handleError(e2, 'getStats.requests');

    const { count: completedCount, error: e3 } = await supabase
      .from('requests')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('status', 'completed');
    if (e3) handleError(e3, 'getStats.completed');

    return {
      members: memberCount || 0,
      requests: requestCount || 0,
      completed: completedCount || 0,
      completionRate: requestCount ? Math.round((completedCount / requestCount) * 100) : 0,
    };
  },
};
