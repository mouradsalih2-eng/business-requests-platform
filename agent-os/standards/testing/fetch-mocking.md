# Fetch Mocking

Mock global fetch for API client testing:

**Basic success response:**
```js
global.fetch.mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ data: 'test' }),
});
```

**Error response:**
```js
global.fetch.mockResolvedValue({
  ok: false,
  json: () => Promise.resolve({ error: 'Invalid credentials' }),
});

await expect(auth.login('test@example.com', 'wrong'))
  .rejects.toThrow('Invalid credentials');
```

**Verify request headers:**
```js
localStorage.getItem.mockReturnValue('test-token');
await auth.me();

expect(global.fetch).toHaveBeenCalledWith(
  expect.any(String),
  expect.objectContaining({
    headers: expect.objectContaining({
      Authorization: 'Bearer test-token',
    }),
  })
);
```

**FormData requests (no Content-Type):**
```js
const formData = new FormData();
formData.append('title', 'Test');
await requests.create(formData);

const [, options] = global.fetch.mock.calls[0];
expect(options.body).toBe(formData);
expect(options.headers['Content-Type']).toBeUndefined();
```

**Rules:**
- Mock `global.fetch` in setupTests.js
- Always provide `ok` boolean and `json()` method
- Verify headers with `expect.objectContaining()`
- Don't set Content-Type for FormData (browser handles it)

