import { supabase } from '../db/supabase.js';
import { AppError, NotFoundError } from '../errors/AppError.js';

function handleError(error, context) {
  console.error(`userRepository.${context}:`, error.message);
  throw new AppError(`Database error in ${context}`, 500);
}

export const userRepository = {
  async findById(id, columns = 'id, email, name, role, profile_picture, theme_preference, created_at') {
    const { data, error } = await supabase
      .from('users')
      .select(columns)
      .eq('id', id)
      .maybeSingle();
    if (error) handleError(error, 'findById');
    return data;
  },

  async findByIdOrFail(id, columns) {
    const user = await this.findById(id, columns);
    if (!user) throw new NotFoundError('User');
    return user;
  },

  async findByEmail(email, columns = '*') {
    const { data, error } = await supabase
      .from('users')
      .select(columns)
      .eq('email', email)
      .maybeSingle();
    if (error) handleError(error, 'findByEmail');
    return data;
  },

  async findAll() {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, name, role, created_at')
      .order('created_at', { ascending: false });
    if (error) handleError(error, 'findAll');
    return data;
  },

  async findAllWithRequestCount() {
    // Supabase can count related rows via the select syntax
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, name, role, created_at, requests(count)')
      .order('created_at', { ascending: false });
    if (error) handleError(error, 'findAllWithRequestCount');
    return users.map(u => ({
      ...u,
      request_count: u.requests?.[0]?.count ?? 0,
      requests: undefined,
    }));
  },

  async search(query) {
    const term = `%${query}%`;
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email')
      .or(`name.ilike.${term},email.ilike.${term}`)
      .order('name')
      .limit(10);
    if (error) handleError(error, 'search');
    return data;
  },

  async findByAuthId(authId) {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, name, role, profile_picture, theme_preference')
      .eq('auth_id', authId)
      .maybeSingle();
    if (error) handleError(error, 'findByAuthId');
    return data;
  },

  async create({ email, password, name, role = 'employee', auth_id }) {
    const insertData = { email, name, role };
    if (password) insertData.password = password;
    if (auth_id) insertData.auth_id = auth_id;

    const { data, error } = await supabase
      .from('users')
      .insert(insertData)
      .select('id, email, name, role, created_at')
      .single();
    if (error) {
      if (error.code === '23505') throw new AppError('A user with this email already exists', 400);
      handleError(error, 'create');
    }
    return data;
  },

  async updateRole(id, role) {
    const { data, error } = await supabase
      .from('users')
      .update({ role })
      .eq('id', id)
      .select('id, email, name, role, created_at')
      .single();
    if (error) handleError(error, 'updateRole');
    return data;
  },

  async updatePassword(id, passwordHash) {
    const { error } = await supabase
      .from('users')
      .update({ password: passwordHash })
      .eq('id', id);
    if (error) handleError(error, 'updatePassword');
  },

  async updateTheme(id, themePreference) {
    const { data, error } = await supabase
      .from('users')
      .update({ theme_preference: themePreference })
      .eq('id', id)
      .select('id, email, name, profile_picture, theme_preference')
      .single();
    if (error) handleError(error, 'updateTheme');
    return data;
  },

  async updateProfilePicture(id, path) {
    const { data, error } = await supabase
      .from('users')
      .update({ profile_picture: path })
      .eq('id', id)
      .select('id, email, name, profile_picture, theme_preference')
      .single();
    if (error) handleError(error, 'updateProfilePicture');
    return data;
  },

  async delete(id) {
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) handleError(error, 'delete');
  },

  async count() {
    const { count, error } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    if (error) handleError(error, 'count');
    return count;
  },
};
