import { supabase } from '../db/supabase.js';
import { AppError, NotFoundError } from '../errors/AppError.js';

function handleError(error, context) {
  console.error(`commentRepository.${context}:`, error.message);
  throw new AppError(`Database error in ${context}`, 500);
}

export const commentRepository = {
  async findById(id) {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) handleError(error, 'findById');
    return data;
  },

  async findByIdWithAuthor(id) {
    const { data, error } = await supabase
      .from('comments_with_author')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) handleError(error, 'findByIdWithAuthor');
    return data;
  },

  async findByRequest(requestId) {
    const { data, error } = await supabase
      .from('comments_with_author')
      .select('*')
      .eq('request_id', requestId)
      .order('created_at');
    if (error) handleError(error, 'findByRequest');
    return data;
  },

  async create(requestId, userId, content) {
    const { data, error } = await supabase
      .from('comments')
      .insert({ request_id: requestId, user_id: userId, content })
      .select('id')
      .single();
    if (error) handleError(error, 'create');
    return data;
  },

  async update(id, content) {
    const { error } = await supabase
      .from('comments')
      .update({ content })
      .eq('id', id);
    if (error) handleError(error, 'update');
  },

  async delete(id) {
    const { error } = await supabase.from('comments').delete().eq('id', id);
    if (error) handleError(error, 'delete');
  },

  async moveToRequest(fromRequestId, toRequestId) {
    const { error } = await supabase
      .from('comments')
      .update({ request_id: toRequestId })
      .eq('request_id', fromRequestId);
    if (error) handleError(error, 'moveToRequest');
  },

  async getCommenters(requestId) {
    const { data, error } = await supabase
      .from('comments')
      .select('users!user_id(id, name)')
      .eq('request_id', requestId);
    if (error) handleError(error, 'getCommenters');

    // Deduplicate
    const seen = new Set();
    return data
      .map(c => c.users)
      .filter(u => { if (seen.has(u.id)) return false; seen.add(u.id); return true; });
  },

  async count() {
    const { count, error } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true });
    if (error) handleError(error, 'count');
    return count;
  },
};

// ── Mention helpers ──────────────────────────────────────────

export const mentionRepository = {
  async saveMentions(commentId, userIds) {
    if (!userIds.length) return;
    // Clear existing
    await supabase.from('comment_mentions').delete().eq('comment_id', commentId);
    // Insert new
    const rows = userIds.map(userId => ({ comment_id: commentId, user_id: userId }));
    await supabase.from('comment_mentions').upsert(rows, { ignoreDuplicates: true });
  },

  async getMentions(commentId) {
    const { data, error } = await supabase
      .from('comment_mentions')
      .select('users!user_id(id, name, email)')
      .eq('comment_id', commentId);
    if (error) return [];
    return data.map(m => m.users);
  },

  async findUserIdsByNames(names) {
    if (!names.length) return [];
    const ids = [];
    for (const name of names) {
      const { data } = await supabase
        .from('users')
        .select('id')
        .or(`name.eq.${name},name.ilike.${name}%`)
        .limit(1)
        .maybeSingle();
      if (data) ids.push(data.id);
    }
    return [...new Set(ids)];
  },
};
