import { supabase } from '../db/supabase.js';
import { AppError, NotFoundError } from '../errors/AppError.js';

function handleError(error, context) {
  console.error(`projectMemberRepository.${context}:`, error.message);
  throw new AppError(`Database error in ${context}`, 500);
}

export const projectMemberRepository = {
  async findByProject(projectId) {
    const { data, error } = await supabase
      .from('project_members')
      .select('id, project_id, user_id, role, joined_at, users(id, name, email, role, profile_picture)')
      .eq('project_id', projectId)
      .order('joined_at');
    if (error) handleError(error, 'findByProject');
    return data.map(pm => ({
      id: pm.id,
      project_id: pm.project_id,
      user_id: pm.user_id,
      role: pm.role,
      joined_at: pm.joined_at,
      user_name: pm.users?.name,
      user_email: pm.users?.email,
      user_global_role: pm.users?.role,
      user_profile_picture: pm.users?.profile_picture,
    }));
  },

  async findByProjectAndUser(projectId, userId) {
    const { data, error } = await supabase
      .from('project_members')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .maybeSingle();
    if (error) handleError(error, 'findByProjectAndUser');
    return data;
  },

  async addMember(projectId, userId, role = 'member') {
    const { data, error } = await supabase
      .from('project_members')
      .insert({ project_id: projectId, user_id: userId, role })
      .select('*')
      .single();
    if (error) {
      if (error.code === '23505') throw new AppError('User is already a member of this project', 400);
      handleError(error, 'addMember');
    }
    return data;
  },

  async updateRole(projectId, userId, role) {
    const { data, error } = await supabase
      .from('project_members')
      .update({ role })
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .select('*')
      .single();
    if (error) handleError(error, 'updateRole');
    return data;
  },

  async removeMember(projectId, userId) {
    const { error } = await supabase
      .from('project_members')
      .delete()
      .eq('project_id', projectId)
      .eq('user_id', userId);
    if (error) handleError(error, 'removeMember');
  },

  async getUserProjectRole(projectId, userId) {
    const member = await this.findByProjectAndUser(projectId, userId);
    return member?.role || null;
  },
};
