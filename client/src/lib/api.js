import { supabase } from './supabase';

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

const STORAGE_KEY = 'selectedProjectId';

/**
 * Get the current Supabase access token.
 * Returns null if no active session.
 */
async function getToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

function getProjectId() {
  return localStorage.getItem(STORAGE_KEY) || null;
}

async function request(endpoint, options = {}) {
  const token = await getToken();

  const config = {
    ...options,
    headers: {
      ...options.headers,
    },
  };

  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  // Attach project ID header
  const projectId = getProjectId();
  if (projectId) {
    config.headers['X-Project-Id'] = projectId;
  }

  // Don't set Content-Type for FormData (let browser set it with boundary)
  if (!(options.body instanceof FormData)) {
    config.headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${endpoint}`, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

// Auth
export const auth = {
  login: async (email, password) => {
    // Sign in via Supabase Auth directly
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);

    // Fetch app user data from our API
    const user = await request('/auth/me');
    return { user, session: data.session };
  },

  register: async (email, password, name) => {
    // Registration is disabled — admin creates users
    throw new Error('Registration is disabled. Please contact an administrator.');
  },

  me: () => request('/auth/me'),

  forgotPassword: (email) =>
    request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token, password) =>
    request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    }),

  forcePasswordChange: (newPassword) =>
    request('/auth/force-password-change', {
      method: 'POST',
      body: JSON.stringify({ new_password: newPassword }),
    }),

  logout: async () => {
    await supabase.auth.signOut();
  },
};

// Requests
export const requests = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/requests${query ? `?${query}` : ''}`);
  },

  search: (query, limit = 10) =>
    request(`/requests/search?q=${encodeURIComponent(query)}&limit=${limit}`),

  getOne: (id) => request(`/requests/${id}`),

  getInteractions: (id) => request(`/requests/${id}/interactions`),

  getActivity: (id) => request(`/requests/${id}/activity`),

  getAnalytics: (period = '7days') => request(`/requests/stats/analytics?period=${period}`),

  markAsRead: (id) =>
    request(`/requests/${id}/read`, {
      method: 'POST',
    }),

  create: (formData) =>
    request('/requests', {
      method: 'POST',
      body: formData,
    }),

  update: (id, data) =>
    request(`/requests/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id) =>
    request(`/requests/${id}`, {
      method: 'DELETE',
    }),

  merge: (id, targetId, options = {}) =>
    request(`/requests/${id}/merge`, {
      method: 'POST',
      body: JSON.stringify({
        target_id: targetId,
        merge_votes: options.mergeVotes ?? true,
        merge_comments: options.mergeComments ?? false,
      }),
    }),
};

// Votes
export const votes = {
  add: (requestId, type) =>
    request(`/requests/${requestId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ type }),
    }),

  remove: (requestId, type) =>
    request(`/requests/${requestId}/vote/${type}`, {
      method: 'DELETE',
    }),

  get: (requestId) => request(`/requests/${requestId}/votes`),
};

// Comments
export const comments = {
  getAll: (requestId) => request(`/requests/${requestId}/comments`),

  add: (requestId, content) =>
    request(`/requests/${requestId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  update: (commentId, content) =>
    request(`/comments/${commentId}`, {
      method: 'PATCH',
      body: JSON.stringify({ content }),
    }),

  delete: (commentId) =>
    request(`/comments/${commentId}`, {
      method: 'DELETE',
    }),
};

// Users
export const users = {
  getAll: () => request('/users'),

  search: (query) => request(`/users/search?q=${encodeURIComponent(query)}`),

  create: (data) =>
    request('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateRole: (id, role) =>
    request(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),

  delete: (id) =>
    request(`/users/${id}`, {
      method: 'DELETE',
    }),

  // User settings
  getSettings: () => request('/users/me/settings'),

  updateSettings: (data) =>
    request('/users/me/settings', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  uploadProfilePicture: (formData) =>
    request('/users/me/profile-picture', {
      method: 'POST',
      body: formData,
    }),

  deleteProfilePicture: () =>
    request('/users/me/profile-picture', {
      method: 'DELETE',
    }),

  // Password change with verification
  requestPasswordChange: (oldPassword, newPassword) =>
    request('/auth/password/request-change', {
      method: 'POST',
      body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
    }),

  changePassword: (code, newPassword) =>
    request('/auth/password/change', {
      method: 'POST',
      body: JSON.stringify({ code, new_password: newPassword }),
    }),

  // Invite user (Google SSO or Email+Password)
  invite: (data) =>
    request('/users/invite', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // List admin users (super_admin only)
  getAdmins: () => request('/users/admins'),

  // Seed data (admin only)
  seedData: () =>
    request('/users/seed', {
      method: 'POST',
    }),

  deleteSeedData: () =>
    request('/users/seed', {
      method: 'DELETE',
    }),
};

// Registration with email verification
export const registration = {
  initiate: (email, password, name) =>
    request('/auth/register/initiate', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }),

  verify: (email, code) =>
    request('/auth/register/verify', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    }),

  resend: (email) =>
    request('/auth/register/resend', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
};

// Roadmap
export const roadmap = {
  getAll: () => request('/roadmap'),

  create: (data) =>
    request('/roadmap', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id, data) =>
    request(`/roadmap/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  move: (id, column_status, position) =>
    request(`/roadmap/${id}/move`, {
      method: 'PATCH',
      body: JSON.stringify({ column_status, position }),
    }),

  promote: (request_id, column_status, position) =>
    request('/roadmap/promote', {
      method: 'POST',
      body: JSON.stringify({ request_id, column_status, position }),
    }),

  delete: (id) =>
    request(`/roadmap/${id}`, {
      method: 'DELETE',
    }),
};

// Feature Flags
export const featureFlags = {
  getAll: () => request('/feature-flags'),

  toggle: (name, enabled) =>
    request(`/feature-flags/${name}`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled }),
    }),
};

// Form Config
export const formConfig = {
  get: () => request('/form-config'),

  update: (data) =>
    request('/form-config', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  createField: (data) =>
    request('/form-config/fields', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateField: (fieldId, data) =>
    request(`/form-config/fields/${fieldId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteField: (fieldId) =>
    request(`/form-config/fields/${fieldId}`, {
      method: 'DELETE',
    }),

  bulkSave: (data) =>
    request('/form-config/bulk', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  reorderFields: (orderedIds) =>
    request('/form-config/fields/reorder', {
      method: 'PATCH',
      body: JSON.stringify({ orderedIds }),
    }),
};

// Super Admin
export const superAdmin = {
  getProjects: () => request('/super-admin/projects'),
  getStats: () => request('/super-admin/stats'),
  getTrends: (days = 30) => request(`/super-admin/trends?days=${days}`),
  getStatusBreakdown: () => request('/super-admin/status-breakdown'),
  getMembersByProject: () => request('/super-admin/members-by-project'),
};

// Projects
export const projects = {
  getAll: () => request('/projects'),

  getOne: (id) => request(`/projects/${id}`),

  create: (data) =>
    request('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id, data) =>
    request(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id) =>
    request(`/projects/${id}`, {
      method: 'DELETE',
    }),

  // Members
  getMembers: (id) => request(`/projects/${id}/members`),

  addMember: (id, userId, role = 'member') =>
    request(`/projects/${id}/members`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, role }),
    }),

  updateMemberRole: (id, userId, role) =>
    request(`/projects/${id}/members/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),

  removeMember: (id, userId) =>
    request(`/projects/${id}/members/${userId}`, {
      method: 'DELETE',
    }),
};
