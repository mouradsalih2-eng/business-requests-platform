import { supabase } from '../db/supabase.js';
import { AppError, NotFoundError } from '../errors/AppError.js';

function handleError(error, context) {
  console.error(`featureFlagRepository.${context}:`, error.message);
  throw new AppError(`Database error in ${context}`, 500);
}

export const featureFlagRepository = {
  async findAll() {
    const { data, error } = await supabase
      .from('feature_flags')
      .select('name, enabled, description')
      .order('name');
    if (error) handleError(error, 'findAll');
    return data;
  },

  async findByName(name) {
    const { data, error } = await supabase
      .from('feature_flags')
      .select('*')
      .eq('name', name)
      .maybeSingle();
    if (error) handleError(error, 'findByName');
    return data;
  },

  async update(name, enabled) {
    const { data, error } = await supabase
      .from('feature_flags')
      .update({ enabled })
      .eq('name', name)
      .select('name, enabled, description')
      .single();
    if (error) handleError(error, 'update');
    return data;
  },

  async isEnabled(name) {
    const flag = await this.findByName(name);
    return flag ? flag.enabled : true; // default to enabled if not found
  },
};
