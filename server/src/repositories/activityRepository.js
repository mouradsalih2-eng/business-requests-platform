import { supabase } from '../db/supabase.js';
import { AppError } from '../errors/AppError.js';

function handleError(error, context) {
  console.error(`activityRepository.${context}:`, error.message);
  throw new AppError(`Database error in ${context}`, 500);
}

export const activityRepository = {
  async findByRequest(requestId) {
    const { data, error } = await supabase
      .from('activity_log')
      .select('*, users!user_id(name)')
      .eq('request_id', requestId)
      .order('created_at', { ascending: false });
    if (error) handleError(error, 'findByRequest');
    return data.map(a => ({ ...a, user_name: a.users?.name, users: undefined }));
  },

  async create({ requestId, userId, action, oldValue = null, newValue = null }) {
    const { error } = await supabase
      .from('activity_log')
      .insert({
        request_id: requestId,
        user_id: userId,
        action,
        old_value: oldValue,
        new_value: newValue,
      });
    if (error) handleError(error, 'create');
  },
};
