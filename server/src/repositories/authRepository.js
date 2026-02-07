import { supabase } from '../db/supabase.js';
import { AppError } from '../errors/AppError.js';

function handleError(error, context) {
  console.error(`authRepository.${context}:`, error.message);
  throw new AppError(`Database error in ${context}`, 500);
}

export const pendingRegistrationRepository = {
  async findByEmail(email) {
    const { data, error } = await supabase
      .from('pending_registrations')
      .select('*')
      .eq('email', email)
      .maybeSingle();
    if (error) handleError(error, 'findByEmail');
    return data;
  },

  async findByEmailAndCode(email, code) {
    const { data, error } = await supabase
      .from('pending_registrations')
      .select('*')
      .eq('email', email)
      .eq('verification_code', code)
      .maybeSingle();
    if (error) handleError(error, 'findByEmailAndCode');
    return data;
  },

  async create({ email, passwordHash, name, verificationCode, expiresAt, authId }) {
    const insertData = {
      email,
      name,
      verification_code: verificationCode,
      expires_at: expiresAt,
    };
    if (passwordHash) insertData.password_hash = passwordHash;
    if (authId) insertData.auth_id = authId;

    const { error } = await supabase
      .from('pending_registrations')
      .upsert(insertData, { onConflict: 'email' });
    if (error) handleError(error, 'create');
  },

  async updateCode(id, code, expiresAt) {
    const { error } = await supabase
      .from('pending_registrations')
      .update({ verification_code: code, expires_at: expiresAt })
      .eq('id', id);
    if (error) handleError(error, 'updateCode');
  },

  async delete(id) {
    const { error } = await supabase.from('pending_registrations').delete().eq('id', id);
    if (error) handleError(error, 'delete');
  },

  async deleteByEmail(email) {
    const { error } = await supabase.from('pending_registrations').delete().eq('email', email);
    if (error) handleError(error, 'deleteByEmail');
  },
};

export const verificationCodeRepository = {
  async findByEmailCodeType(email, code, type) {
    const { data, error } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('email', email)
      .eq('code', code)
      .eq('type', type)
      .maybeSingle();
    if (error) handleError(error, 'findByEmailCodeType');
    return data;
  },

  async create({ email, code, type, expiresAt, pendingData = null }) {
    const { error } = await supabase
      .from('verification_codes')
      .insert({
        email,
        code,
        type,
        expires_at: expiresAt,
        pending_data: pendingData,
      });
    if (error) handleError(error, 'create');
  },

  async deleteByEmailAndType(email, type) {
    const { error } = await supabase
      .from('verification_codes')
      .delete()
      .eq('email', email)
      .eq('type', type);
    if (error) handleError(error, 'deleteByEmailAndType');
  },

  async delete(id) {
    const { error } = await supabase.from('verification_codes').delete().eq('id', id);
    if (error) handleError(error, 'delete');
  },
};

export const passwordResetRepository = {
  async findByToken(token) {
    const { data, error } = await supabase
      .from('password_reset_tokens')
      .select('*')
      .eq('token', token)
      .maybeSingle();
    if (error) handleError(error, 'findByToken');
    return data;
  },

  async create(userId, token, expiresAt) {
    const { error } = await supabase
      .from('password_reset_tokens')
      .insert({ user_id: userId, token, expires_at: expiresAt });
    if (error) handleError(error, 'create');
  },

  async deleteByUserId(userId) {
    const { error } = await supabase
      .from('password_reset_tokens')
      .delete()
      .eq('user_id', userId);
    if (error) handleError(error, 'deleteByUserId');
  },

  async delete(id) {
    const { error } = await supabase.from('password_reset_tokens').delete().eq('id', id);
    if (error) handleError(error, 'delete');
  },
};
