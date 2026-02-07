import { supabase } from '../db/supabase.js';
import { AppError } from '../errors/AppError.js';

function handleError(error, context) {
  console.error(`adminReadRepository.${context}:`, error.message);
  throw new AppError(`Database error in ${context}`, 500);
}

export const adminReadRepository = {
  async isRead(requestId, adminId) {
    const { data, error } = await supabase
      .from('admin_read_requests')
      .select('id')
      .eq('request_id', requestId)
      .eq('admin_id', adminId)
      .maybeSingle();
    if (error) handleError(error, 'isRead');
    return !!data;
  },

  async markRead(requestId, adminId) {
    const { error } = await supabase
      .from('admin_read_requests')
      .upsert({ request_id: requestId, admin_id: adminId }, { onConflict: 'request_id,admin_id' });
    if (error) handleError(error, 'markRead');
  },
};
