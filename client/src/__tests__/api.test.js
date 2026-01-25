import { describe, it, expect, vi, beforeEach } from 'vitest';

// We need to test the request function behavior
// Since it uses import.meta.env, we'll test the exported API functions

describe('API utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.getItem.mockReturnValue(null);
    global.fetch.mockReset();
  });

  describe('request function behavior', () => {
    it('includes Authorization header when token exists', async () => {
      localStorage.getItem.mockReturnValue('test-token');
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
      });

      // Import after mocks are set up
      const { auth } = await import('../lib/api');
      await auth.me();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });

    it('does not include Authorization header when no token', async () => {
      localStorage.getItem.mockReturnValue(null);
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ user: {}, token: 'new-token' }),
      });

      const { auth } = await import('../lib/api');
      await auth.login('test@example.com', 'password');

      const fetchCall = global.fetch.mock.calls[0];
      expect(fetchCall[1].headers.Authorization).toBeUndefined();
    });

    it('sets Content-Type to application/json for non-FormData', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ user: {}, token: 'token' }),
      });

      const { auth } = await import('../lib/api');
      await auth.login('test@example.com', 'password');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('throws error on non-ok response', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Invalid credentials' }),
      });

      const { auth } = await import('../lib/api');

      await expect(auth.login('test@example.com', 'wrong')).rejects.toThrow(
        'Invalid credentials'
      );
    });

    it('handles error response without json body', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        json: () => Promise.reject(new Error('No JSON')),
      });

      const { auth } = await import('../lib/api');

      await expect(auth.login('test@example.com', 'wrong')).rejects.toThrow(
        'Request failed'
      );
    });
  });

  describe('auth API', () => {
    it('login sends correct payload', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ user: { id: 1 }, token: 'token' }),
      });

      const { auth } = await import('../lib/api');
      await auth.login('test@example.com', 'password123');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/login'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
        })
      );
    });

    it('register sends correct payload', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ user: { id: 1 }, token: 'token' }),
      });

      const { auth } = await import('../lib/api');
      await auth.register('test@example.com', 'password123', 'Test User');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/register'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'password123',
            name: 'Test User',
          }),
        })
      );
    });

    it('me calls correct endpoint', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 1, name: 'User' }),
      });

      const { auth } = await import('../lib/api');
      await auth.me();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/me'),
        expect.any(Object)
      );
    });
  });

  describe('requests API', () => {
    it('getAll builds correct query string', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const { requests } = await import('../lib/api');
      await requests.getAll({ status: 'pending', category: 'bug' });

      const fetchUrl = global.fetch.mock.calls[0][0];
      expect(fetchUrl).toContain('status=pending');
      expect(fetchUrl).toContain('category=bug');
    });

    it('getOne calls correct endpoint', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 5 }),
      });

      const { requests } = await import('../lib/api');
      await requests.getOne(5);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/requests/5'),
        expect.any(Object)
      );
    });

    it('create sends FormData correctly', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 1 }),
      });

      const formData = new FormData();
      formData.append('title', 'Test Request');

      const { requests } = await import('../lib/api');
      await requests.create(formData);

      const fetchCall = global.fetch.mock.calls[0];
      expect(fetchCall[1].method).toBe('POST');
      expect(fetchCall[1].body).toBe(formData);
      // Content-Type should not be set for FormData
      expect(fetchCall[1].headers['Content-Type']).toBeUndefined();
    });

    it('update sends PATCH request', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 1 }),
      });

      const { requests } = await import('../lib/api');
      await requests.update(1, { status: 'completed' });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/requests/1'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ status: 'completed' }),
        })
      );
    });

    it('delete sends DELETE request', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ message: 'Deleted' }),
      });

      const { requests } = await import('../lib/api');
      await requests.delete(1);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/requests/1'),
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  describe('votes API', () => {
    it('add vote sends correct payload', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const { votes } = await import('../lib/api');
      await votes.add(1, 'upvote');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/requests/1/vote'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ type: 'upvote' }),
        })
      );
    });

    it('remove vote sends DELETE request', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const { votes } = await import('../lib/api');
      await votes.remove(1, 'upvote');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/requests/1/vote/upvote'),
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  describe('comments API', () => {
    it('add comment sends correct payload', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const { comments } = await import('../lib/api');
      await comments.add(1, 'This is a comment');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/requests/1/comments'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ content: 'This is a comment' }),
        })
      );
    });

    it('update comment sends PATCH request', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const { comments } = await import('../lib/api');
      await comments.update(5, 'Updated content');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/comments/5'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ content: 'Updated content' }),
        })
      );
    });
  });
});
