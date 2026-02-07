import { supabase } from '../db/supabase.js';
import { AppError, NotFoundError } from '../errors/AppError.js';

function handleError(error, context) {
  console.error(`formConfigRepository.${context}:`, error.message);
  throw new AppError(`Database error in ${context}`, 500);
}

export const formConfigRepository = {
  // ── Form Config (Level 1 + 2) ────────────────────────────

  async getConfig(projectId) {
    const { data, error } = await supabase
      .from('project_form_config')
      .select('*')
      .eq('project_id', projectId)
      .maybeSingle();
    if (error) handleError(error, 'getConfig');
    return data;
  },

  async upsertConfig(projectId, config) {
    const { data, error } = await supabase
      .from('project_form_config')
      .upsert({ project_id: projectId, ...config }, { onConflict: 'project_id' })
      .select('*')
      .single();
    if (error) handleError(error, 'upsertConfig');
    return data;
  },

  // ── Custom Fields (Level 3) ──────────────────────────────

  async getCustomFields(projectId) {
    const { data, error } = await supabase
      .from('project_custom_fields')
      .select('*')
      .eq('project_id', projectId)
      .order('sort_order')
      .order('id');
    if (error) handleError(error, 'getCustomFields');
    return data;
  },

  async getCustomField(id) {
    const { data, error } = await supabase
      .from('project_custom_fields')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) handleError(error, 'getCustomField');
    return data;
  },

  async createCustomField(projectId, field) {
    const { data, error } = await supabase
      .from('project_custom_fields')
      .insert({ project_id: projectId, ...field })
      .select('*')
      .single();
    if (error) {
      if (error.code === '23505') throw new AppError('A field with this name already exists', 400);
      handleError(error, 'createCustomField');
    }
    return data;
  },

  async updateCustomField(id, updates) {
    const { data, error } = await supabase
      .from('project_custom_fields')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();
    if (error) handleError(error, 'updateCustomField');
    return data;
  },

  async deleteCustomField(id) {
    const { error } = await supabase.from('project_custom_fields').delete().eq('id', id);
    if (error) handleError(error, 'deleteCustomField');
  },
};
