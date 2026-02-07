# Optimistic Updates

For instant UI feedback, use this mutation pattern:

```js
useMutation({
  mutationFn: (data) => api.update(data),

  onMutate: async (data) => {
    await queryClient.cancelQueries({ queryKey });
    const previous = queryClient.getQueryData(queryKey);
    queryClient.setQueryData(queryKey, optimisticValue);
    return { previous };  // Save for rollback
  },

  onError: (err, data, context) => {
    queryClient.setQueryData(queryKey, context.previous);  // Rollback
  },

  onSettled: () => {
    queryClient.invalidateQueries({ queryKey });  // Sync with server
  }
});
```

**Common mistake:** Forgetting `onError` rollback - users see stale optimistic state on failure.

**Always:**
1. Save previous state in `onMutate`
2. Return it for `context`
3. Restore in `onError`
4. Invalidate in `onSettled` to sync truth
