import { supabase } from '../db/supabase.js';
import { AppError, NotFoundError } from '../errors/AppError.js';

function handleError(error, context) {
  console.error(`requestRepository.${context}:`, error.message);
  throw new AppError(`Database error in ${context}`, 500);
}

export const requestRepository = {
  async findById(id) {
    const { data, error } = await supabase
      .from('requests')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) handleError(error, 'findById');
    return data;
  },

  async findByIdOrFail(id) {
    const request = await this.findById(id);
    if (!request) throw new NotFoundError('Request');
    return request;
  },

  async findByIdWithCounts(id) {
    const { data, error } = await supabase
      .from('requests_with_counts')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) handleError(error, 'findByIdWithCounts');
    return data;
  },

  async findByTitle(title) {
    const { data, error } = await supabase
      .from('requests')
      .select('id')
      .eq('title', title)
      .maybeSingle();
    if (error) handleError(error, 'findByTitle');
    return data;
  },

  async findByTitleInProject(title, projectId) {
    const { data, error } = await supabase
      .from('requests')
      .select('id')
      .eq('title', title)
      .eq('project_id', projectId)
      .maybeSingle();
    if (error) handleError(error, 'findByTitleInProject');
    return data;
  },

  /**
   * Builds and runs a filtered, sorted query against the requests_with_counts view.
   */
  async findAll({ status, category, priority, sort, order, myRequests, timePeriod, search, userId, projectId, ids }) {
    let query = supabase.from('requests_with_counts').select('*');

    if (projectId) query = query.eq('project_id', projectId);
    if (ids?.length) query = query.in('id', ids);

    // Exclude archived unless specifically filtering for them
    if (status !== 'archived') {
      query = query.neq('status', 'archived');
    }

    if (myRequests === 'true') {
      query = query.eq('user_id', userId);
    }

    if (timePeriod) {
      const startDate = getTimePeriodStart(timePeriod);
      if (startDate) query = query.gte('created_at', startDate.toISOString());
    }

    if (search?.trim()) {
      const term = `%${search.trim()}%`;
      query = query.or(`title.ilike.${term},author_name.ilike.${term}`);
    }

    if (status) query = query.eq('status', status);
    if (category) query = query.eq('category', category);
    if (priority) query = query.eq('priority', priority);

    // Sorting
    const ascending = order === 'asc';
    if (sort === 'upvotes') {
      query = query.order('upvotes', { ascending }).order('created_at', { ascending: false });
    } else if (sort === 'likes') {
      query = query.order('likes', { ascending }).order('created_at', { ascending: false });
    } else {
      query = query.order('created_at', { ascending });
    }

    const { data, error } = await query;
    if (error) handleError(error, 'findAll');
    return data;
  },

  async findForAnalytics(startDate, projectId) {
    let query = supabase
      .from('requests')
      .select('id, created_at, status, category, priority, team, region')
      .gte('created_at', startDate.toISOString());
    if (projectId) query = query.eq('project_id', projectId);
    const { data, error } = await query.order('created_at');
    if (error) handleError(error, 'findForAnalytics');
    return data;
  },

  async findAllBasic(projectId) {
    let query = supabase
      .from('requests')
      .select('id, title, status, category, user_id, users!user_id(name)');
    if (projectId) query = query.eq('project_id', projectId);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) handleError(error, 'findAllBasic');
    return data.map(r => ({
      id: r.id,
      title: r.title,
      status: r.status,
      category: r.category,
      author_name: r.users?.name,
    }));
  },

  async create(data) {
    const { data: request, error } = await supabase
      .from('requests')
      .insert(data)
      .select('*')
      .single();
    if (error) handleError(error, 'create');
    return request;
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('requests')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();
    if (error) handleError(error, 'update');
    return data;
  },

  async delete(id) {
    const { error } = await supabase.from('requests').delete().eq('id', id);
    if (error) handleError(error, 'delete');
  },

  async count() {
    const { count, error } = await supabase
      .from('requests')
      .select('*', { count: 'exact', head: true });
    if (error) handleError(error, 'count');
    return count;
  },

  async countByProject(projectId) {
    const { count, error } = await supabase
      .from('requests')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId);
    if (error) handleError(error, 'countByProject');
    return count;
  },
};

// ── helpers ──────────────────────────────────────────────────

function getTimePeriodStart(timePeriod) {
  const now = new Date();
  switch (timePeriod) {
    case 'today':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case '7days':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30days':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case '90days':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    default:
      return null;
  }
}
