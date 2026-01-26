import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { roadmap } from '../lib/api';
import { queryKeys } from '../lib/queryClient';

/**
 * Hook to fetch all roadmap items
 */
export function useRoadmap() {
  return useQuery({
    queryKey: queryKeys.roadmap.all,
    queryFn: () => roadmap.getAll(),
  });
}

/**
 * Hook to create a roadmap item
 */
export function useCreateRoadmapItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => roadmap.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.roadmap.all });
    },
  });
}

/**
 * Hook to update a roadmap item
 */
export function useUpdateRoadmapItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => roadmap.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.roadmap.all });
    },
  });
}

/**
 * Hook to move a roadmap item between columns
 */
export function useMoveRoadmapItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, column_status, position }) => roadmap.move(id, column_status, position),
    onMutate: async ({ id, column_status, position }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.roadmap.all });

      // Snapshot previous value
      const previousRoadmap = queryClient.getQueryData(queryKeys.roadmap.all);

      // Optimistically update
      if (previousRoadmap) {
        const newRoadmap = { ...previousRoadmap };

        // Find and remove item from current column
        let movedItem = null;
        for (const column of Object.keys(newRoadmap)) {
          const index = newRoadmap[column]?.findIndex(item => item.id === id);
          if (index !== undefined && index !== -1) {
            movedItem = { ...newRoadmap[column][index] };
            newRoadmap[column] = [...newRoadmap[column]];
            newRoadmap[column].splice(index, 1);
            break;
          }
        }

        // Add to new column at position
        if (movedItem) {
          movedItem.column_status = column_status;
          if (!newRoadmap[column_status]) {
            newRoadmap[column_status] = [];
          }
          newRoadmap[column_status] = [...newRoadmap[column_status]];
          newRoadmap[column_status].splice(position, 0, movedItem);
        }

        queryClient.setQueryData(queryKeys.roadmap.all, newRoadmap);
      }

      return { previousRoadmap };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousRoadmap) {
        queryClient.setQueryData(queryKeys.roadmap.all, context.previousRoadmap);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.roadmap.all });
    },
  });
}

/**
 * Hook to delete a roadmap item
 */
export function useDeleteRoadmapItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => roadmap.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.roadmap.all });
    },
  });
}

/**
 * Hook to promote a synced request to a full roadmap item
 */
export function usePromoteToRoadmapItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ request_id, column_status, position }) =>
      roadmap.promote(request_id, column_status, position),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.roadmap.all });
      queryClient.invalidateQueries({ queryKey: ['requests'] });
    },
  });
}

export default {
  useRoadmap,
  useCreateRoadmapItem,
  useUpdateRoadmapItem,
  useMoveRoadmapItem,
  useDeleteRoadmapItem,
  usePromoteToRoadmapItem,
};
