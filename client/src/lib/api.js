const API_BASE = import.meta.env.VITE_API_URL || '/api';

function getToken() {
  return localStorage.getItem('token');
}

async function request(endpoint, options = {}) {
  const token = getToken();

  const config = {
    ...options,
    headers: {
      ...options.headers,
    },
  };

  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
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
  login: (email, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (email, password, name) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }),

  me: () => request('/auth/me'),
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

  changePassword: (code) =>
    request('/auth/password/change', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  // Seed data (admin only)
  seedData: () =>
    request('/users/seed', {
      method: 'POST',
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
