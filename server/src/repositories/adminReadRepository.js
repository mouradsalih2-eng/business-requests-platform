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

  async getReadStatusForMultiple(requestIds, adminId) {
    if (!requestIds.length) return new Set();
    const { data, error } = await supabase
      .from('admin_read_requests')
      .select('request_id')
      .in('request_id', requestIds)
      .eq('admin_id', adminId);
    if (error) handleError(error, 'getReadStatusForMultiple');
    return new Set(data.map(r => r.request_id));
  },

  async markRead(requestId, adminId) {
    const { error } = await supabase
      .from('admin_read_requests')
      .upsert({ request_id: requestId, admin_id: adminId }, { onConflict: 'request_id,admin_id' });
    if (error) handleError(error, 'markRead');
  },
};
