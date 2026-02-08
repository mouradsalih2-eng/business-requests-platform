import { supabase } from '../db/supabase.js';
import { AppError } from '../errors/AppError.js';

function handleError(error, context) {
  console.error(`voteRepository.${context}:`, error.message);
  throw new AppError(`Database error in ${context}`, 500);
}

export const voteRepository = {
  async findByRequestAndUser(requestId, userId, type) {
    const query = supabase
      .from('votes')
      .select('id')
      .eq('request_id', requestId)
      .eq('user_id', userId);

    if (type) query = query.eq('type', type);

    const { data, error } = await query.maybeSingle();
    if (error && error.code !== 'PGRST116') handleError(error, 'findByRequestAndUser');
    return data;
  },

  async getUserVoteTypes(requestId, userId) {
    const { data, error } = await supabase
      .from('votes')
      .select('type')
      .eq('request_id', requestId)
      .eq('user_id', userId);
    if (error) handleError(error, 'getUserVoteTypes');
    return data.map(v => v.type);
  },

  async getUserVotesForMultiple(requestIds, userId) {
    if (!requestIds.length) return {};
    const { data, error } = await supabase
      .from('votes')
      .select('request_id, type')
      .in('request_id', requestIds)
      .eq('user_id', userId);
    if (error) handleError(error, 'getUserVotesForMultiple');
    return data.reduce((acc, v) => {
      if (!acc[v.request_id]) acc[v.request_id] = [];
      acc[v.request_id].push(v.type);
      return acc;
    }, {});
  },

  async getCounts(requestId) {
    const [upRes, likeRes] = await Promise.all([
      supabase.from('votes').select('*', { count: 'exact', head: true }).eq('request_id', requestId).eq('type', 'upvote'),
      supabase.from('votes').select('*', { count: 'exact', head: true }).eq('request_id', requestId).eq('type', 'like'),
    ]);
    if (upRes.error) handleError(upRes.error, 'getCounts.upvote');
    if (likeRes.error) handleError(likeRes.error, 'getCounts.like');
    return { upvotes: upRes.count, likes: likeRes.count };
  },

  async create(requestId, userId, type) {
    const { error } = await supabase
      .from('votes')
      .insert({ request_id: requestId, user_id: userId, type });
    if (error) {
      if (error.code === '23505') throw new AppError(`You have already ${type}d this request`, 400);
      handleError(error, 'create');
    }
  },

  async delete(requestId, userId, type) {
    const { error } = await supabase
      .from('votes')
      .delete()
      .eq('request_id', requestId)
      .eq('user_id', userId)
      .eq('type', type);
    if (error) handleError(error, 'delete');
  },

  async findByRequest(requestId) {
    const { data, error } = await supabase
      .from('votes')
      .select('user_id, type')
      .eq('request_id', requestId);
    if (error) handleError(error, 'findByRequest');
    return data;
  },

  async deleteByRequest(requestId) {
    const { error } = await supabase.from('votes').delete().eq('request_id', requestId);
    if (error) handleError(error, 'deleteByRequest');
  },

  async getUpvoters(requestId) {
    const { data, error } = await supabase
      .from('votes')
      .select('users!user_id(id, name)')
      .eq('request_id', requestId)
      .eq('type', 'upvote')
      .order('created_at', { ascending: false });
    if (error) handleError(error, 'getUpvoters');
    return data.map(v => v.users);
  },

  async getLikers(requestId) {
    const { data, error } = await supabase
      .from('votes')
      .select('users!user_id(id, name)')
      .eq('request_id', requestId)
      .eq('type', 'like')
      .order('created_at', { ascending: false });
    if (error) handleError(error, 'getLikers');
    return data.map(v => v.users);
  },

  async count() {
    const { count, error } = await supabase
      .from('votes')
      .select('*', { count: 'exact', head: true });
    if (error) handleError(error, 'count');
    return count;
  },
};
