import { supabase } from '../db/supabase.js';
import { AppError, NotFoundError } from '../errors/AppError.js';

function handleError(error, context) {
  console.error(`featureFlagRepository.${context}:`, error.message);
  throw new AppError(`Database error in ${context}`, 500);
}

export const featureFlagRepository = {
  async findAll(projectId) {
    let query = supabase
      .from('feature_flags')
      .select('name, enabled, description, project_id')
      .order('name');
    if (projectId) query = query.eq('project_id', projectId);
    const { data, error } = await query;
    if (error) handleError(error, 'findAll');
    return data;
  },

  async findByName(name, projectId) {
    let query = supabase
      .from('feature_flags')
      .select('*')
      .eq('name', name);
    if (projectId) query = query.eq('project_id', projectId);
    const { data, error } = await query.maybeSingle();
    if (error) handleError(error, 'findByName');
    return data;
  },

  async update(name, enabled, projectId) {
    let query = supabase
      .from('feature_flags')
      .update({ enabled })
      .eq('name', name);
    if (projectId) query = query.eq('project_id', projectId);
    const { data, error } = await query.select('name, enabled, description').single();
    if (error) handleError(error, 'update');
    return data;
  },

  async isEnabled(name, projectId) {
    const flag = await this.findByName(name, projectId);
    return flag ? flag.enabled : true; // default to enabled if not found
  },
};
