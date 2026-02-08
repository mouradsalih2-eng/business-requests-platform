import { supabase } from '../db/supabase.js';
import { AppError } from '../errors/AppError.js';

function handleError(error, context) {
  console.error(`watcherRepository.${context}:`, error.message);
  throw new AppError(`Database error in ${context}`, 500);
}

export const watcherRepository = {
  async isWatching(requestId, userId) {
    const { data, error } = await supabase
      .from('request_watchers')
      .select('user_id')
      .eq('request_id', requestId)
      .eq('user_id', userId)
      .maybeSingle();
    if (error) handleError(error, 'isWatching');
    return !!data;
  },

  async watch(requestId, userId, autoSubscribed = false) {
    const { error } = await supabase
      .from('request_watchers')
      .upsert(
        { request_id: requestId, user_id: userId, auto_subscribed: autoSubscribed },
        { onConflict: 'user_id,request_id' }
      );
    if (error) handleError(error, 'watch');
  },

  async unwatch(requestId, userId) {
    const { error } = await supabase
      .from('request_watchers')
      .delete()
      .eq('request_id', requestId)
      .eq('user_id', userId);
    if (error) handleError(error, 'unwatch');
  },

  async getWatchers(requestId) {
    const { data, error } = await supabase
      .from('request_watchers')
      .select('user_id, auto_subscribed, created_at, users!user_id(id, name, email)')
      .eq('request_id', requestId)
      .order('created_at', { ascending: false });
    if (error) handleError(error, 'getWatchers');
    return data.map(w => ({
      ...w.users,
      auto_subscribed: w.auto_subscribed,
      watched_at: w.created_at,
    }));
  },

  async getWatcherCount(requestId) {
    const { count, error } = await supabase
      .from('request_watchers')
      .select('*', { count: 'exact', head: true })
      .eq('request_id', requestId);
    if (error) handleError(error, 'getWatcherCount');
    return count;
  },

  async getWatchedRequestIds(userId) {
    const { data, error } = await supabase
      .from('request_watchers')
      .select('request_id')
      .eq('user_id', userId);
    if (error) handleError(error, 'getWatchedRequestIds');
    return data.map(w => w.request_id);
  },

  async getWatchStatusForMultiple(requestIds, userId) {
    if (!requestIds.length) return new Set();
    const { data, error } = await supabase
      .from('request_watchers')
      .select('request_id')
      .in('request_id', requestIds)
      .eq('user_id', userId);
    if (error) handleError(error, 'getWatchStatusForMultiple');
    return new Set(data.map(w => w.request_id));
  },
};
