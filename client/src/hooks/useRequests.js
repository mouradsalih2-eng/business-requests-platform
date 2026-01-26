import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { requests, votes } from '../lib/api';
import { queryKeys } from '../lib/queryClient';

/**
 * Hook to fetch all requests with optional filters
 */
export function useRequests(filters = {}) {
  return useQuery({
    queryKey: queryKeys.requests.list(filters),
    queryFn: () => requests.getAll(filters),
  });
}

/**
 * Hook to fetch a single request by ID
 */
export function useRequest(id) {
  return useQuery({
    queryKey: queryKeys.requests.detail(id),
    queryFn: () => requests.getOne(id),
    enabled: !!id,
  });
}

/**
 * Hook to fetch request interactions (votes, user's own votes)
 */
export function useRequestInteractions(id) {
  return useQuery({
    queryKey: queryKeys.requests.interactions(id),
    queryFn: () => requests.getInteractions(id),
    enabled: !!id,
  });
}

/**
 * Hook to fetch request activity log
 */
export function useRequestActivity(id) {
  return useQuery({
    queryKey: queryKeys.requests.activity(id),
    queryFn: () => requests.getActivity(id),
    enabled: !!id,
  });
}

/**
 * Hook to fetch analytics data
 */
export function useRequestAnalytics(period = '7days') {
  return useQuery({
    queryKey: queryKeys.requests.analytics(period),
    queryFn: () => requests.getAnalytics(period),
  });
}

/**
 * Hook to search requests (for duplicate detection)
 */
export function useRequestSearch(query, options = {}) {
  return useQuery({
    queryKey: queryKeys.requests.search(query),
    queryFn: () => requests.search(query, options.limit || 10),
    enabled: !!query && query.length >= 5,
    staleTime: 10 * 1000, // 10 seconds for search results
  });
}

/**
 * Hook to create a new request
 */
export function useCreateRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formData) => requests.create(formData),
    onSuccess: () => {
      // Invalidate all request lists
      queryClient.invalidateQueries({ queryKey: queryKeys.requests.all });
    },
  });
}

/**
 * Hook to update a request
 */
export function useUpdateRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => requests.update(id, data),
    onSuccess: (_, { id }) => {
      // Invalidate the specific request and all lists
      queryClient.invalidateQueries({ queryKey: queryKeys.requests.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.requests.all });
    },
  });
}

/**
 * Hook to delete a request
 */
export function useDeleteRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => requests.delete(id),
    onSuccess: () => {
      // Invalidate all request lists
      queryClient.invalidateQueries({ queryKey: queryKeys.requests.all });
    },
  });
}

/**
 * Hook to mark a request as read
 */
export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => requests.markAsRead(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.requests.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.requests.all });
    },
  });
}

/**
 * Hook for voting with optimistic updates
 */
export function useVote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ requestId, type, action }) => {
      if (action === 'add') {
        return votes.add(requestId, type);
      }
      return votes.remove(requestId, type);
    },
    onMutate: async ({ requestId, type, action }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.requests.interactions(requestId) });

      // Snapshot previous value
      const previousInteractions = queryClient.getQueryData(queryKeys.requests.interactions(requestId));

      // Optimistically update
      if (previousInteractions) {
        const update = { ...previousInteractions };
        const voteKey = type === 'upvote' ? 'upvotes' : 'likes';
        const userVoteKey = type === 'upvote' ? 'userUpvoted' : 'userLiked';

        if (action === 'add') {
          update[voteKey] = (update[voteKey] || 0) + 1;
          update[userVoteKey] = true;
        } else {
          update[voteKey] = Math.max(0, (update[voteKey] || 0) - 1);
          update[userVoteKey] = false;
        }

        queryClient.setQueryData(queryKeys.requests.interactions(requestId), update);
      }

      return { previousInteractions };
    },
    onError: (err, { requestId }, context) => {
      // Rollback on error
      if (context?.previousInteractions) {
        queryClient.setQueryData(queryKeys.requests.interactions(requestId), context.previousInteractions);
      }
    },
    onSettled: (_, __, { requestId }) => {
      // Refetch to ensure server state
      queryClient.invalidateQueries({ queryKey: queryKeys.requests.interactions(requestId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.requests.all });
    },
  });
}

export default {
  useRequests,
  useRequest,
  useRequestInteractions,
  useRequestActivity,
  useRequestAnalytics,
  useRequestSearch,
  useCreateRequest,
  useUpdateRequest,
  useDeleteRequest,
  useMarkAsRead,
  useVote,
};
