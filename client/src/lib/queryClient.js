import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 seconds
      gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
    },
  },
});

// Query keys for consistent cache management
export const queryKeys = {
  requests: {
    all: ['requests'],
    list: (filters) => ['requests', 'list', filters],
    detail: (id) => ['requests', 'detail', id],
    interactions: (id) => ['requests', 'interactions', id],
    activity: (id) => ['requests', 'activity', id],
    analytics: (period) => ['requests', 'analytics', period],
    search: (query) => ['requests', 'search', query],
  },
  roadmap: {
    all: ['roadmap'],
  },
  users: {
    all: ['users'],
    search: (query) => ['users', 'search', query],
    settings: ['users', 'settings'],
  },
  comments: {
    list: (requestId) => ['comments', requestId],
  },
  votes: {
    get: (requestId) => ['votes', requestId],
  },
  formConfig: {
    byProject: (projectId) => ['formConfig', projectId],
  },
};

export default queryClient;
