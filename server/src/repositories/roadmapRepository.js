import { supabase } from '../db/supabase.js';
import { AppError, NotFoundError } from '../errors/AppError.js';

function handleError(error, context) {
  console.error(`roadmapRepository.${context}:`, error.message);
  throw new AppError(`Database error in ${context}`, 500);
}

export const roadmapRepository = {
  async findAll() {
    const { data, error } = await supabase
      .from('roadmap_items')
      .select(`
        *,
        requests!request_id(title, status, category, priority, team, region),
        users!created_by(name)
      `)
      .order('position')
      .order('created_at');
    if (error) handleError(error, 'findAll');

    return data.map(item => ({
      ...item,
      request_title: item.requests?.title,
      request_status: item.requests?.status,
      request_category: item.requests?.category,
      request_priority: item.requests?.priority,
      request_team: item.requests?.team,
      request_region: item.requests?.region,
      created_by_name: item.users?.name,
      source: 'roadmap',
      requests: undefined,
      users: undefined,
    }));
  },

  async findSyncableRequests(excludeIds) {
    let query = supabase
      .from('requests')
      .select('id, title, business_problem, category, priority, team, region, status, created_at, updated_at, users!user_id(name)')
      .not('status', 'in', '(rejected,duplicate,archived)')
      .order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) handleError(error, 'findSyncableRequests');

    return data
      .filter(r => !excludeIds.includes(r.id))
      .map(r => ({
        ...r,
        created_by_name: r.users?.name,
        description: r.business_problem,
        users: undefined,
        business_problem: undefined,
      }));
  },

  async findById(id) {
    const { data, error } = await supabase
      .from('roadmap_items')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) handleError(error, 'findById');
    return data;
  },

  async findByIdOrFail(id) {
    const item = await this.findById(id);
    if (!item) throw new NotFoundError('Roadmap item');
    return item;
  },

  async findByRequestId(requestId) {
    const { data, error } = await supabase
      .from('roadmap_items')
      .select('*')
      .eq('request_id', requestId)
      .maybeSingle();
    if (error) handleError(error, 'findByRequestId');
    return data;
  },

  async getMaxPosition(columnStatus) {
    const { data, error } = await supabase
      .from('roadmap_items')
      .select('position')
      .eq('column_status', columnStatus)
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) handleError(error, 'getMaxPosition');
    return data?.position ?? -1;
  },

  async create(item) {
    const { data, error } = await supabase
      .from('roadmap_items')
      .insert(item)
      .select('*')
      .single();
    if (error) handleError(error, 'create');
    return data;
  },

  async findByIdWithCreator(id) {
    const { data, error } = await supabase
      .from('roadmap_items')
      .select('*, users!created_by(name)')
      .eq('id', id)
      .maybeSingle();
    if (error) handleError(error, 'findByIdWithCreator');
    if (!data) return null;
    return { ...data, created_by_name: data.users?.name, users: undefined };
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('roadmap_items')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();
    if (error) handleError(error, 'update');
    return data;
  },

  async delete(id) {
    const { error } = await supabase.from('roadmap_items').delete().eq('id', id);
    if (error) handleError(error, 'delete');
  },

  async updatePositionsInColumn(columnStatus, abovePosition, delta) {
    // Shift positions: add delta to all items in column with position > abovePosition
    // Supabase doesn't support UPDATE ... SET position = position + 1 directly
    // So we fetch, compute, and batch update
    const { data, error } = await supabase
      .from('roadmap_items')
      .select('id, position')
      .eq('column_status', columnStatus)
      .gt('position', abovePosition)
      .order('position', { ascending: delta > 0 });
    if (error) handleError(error, 'updatePositionsInColumn');

    for (const item of data) {
      await supabase
        .from('roadmap_items')
        .update({ position: item.position + delta })
        .eq('id', item.id);
    }
  },

  async updatePositionsInRange(columnStatus, fromPos, toPos, delta) {
    const { data, error } = await supabase
      .from('roadmap_items')
      .select('id, position')
      .eq('column_status', columnStatus)
      .gte('position', fromPos)
      .lte('position', toPos);
    if (error) handleError(error, 'updatePositionsInRange');

    for (const item of data) {
      await supabase
        .from('roadmap_items')
        .update({ position: item.position + delta })
        .eq('id', item.id);
    }
  },
};
