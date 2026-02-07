# Query Key Structure

Use hierarchical arrays for React Query keys:

```js
queryKeys.requests.list(filters)  // ['requests', 'list', filters]
queryKeys.requests.detail(id)     // ['requests', 'detail', id]
```

**Why:** Enables granular cache invalidation.

```js
// Invalidate ALL request queries
queryClient.invalidateQueries({ queryKey: ['requests'] })

// Invalidate only detail queries
queryClient.invalidateQueries({ queryKey: ['requests', 'detail'] })

// Invalidate specific request
queryClient.invalidateQueries({ queryKey: ['requests', 'detail', id] })
```

**Rules:**
- Define keys in `queryClient.js`, not inline
- First element = resource type
- Second element = operation type
- Third element = parameters
