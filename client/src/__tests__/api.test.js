import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '../lib/supabase';

describe('API utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch.mockReset();
    // Default: no active session
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } });
  });

  describe('request function behavior', () => {
    it('includes Authorization header when session exists', async () => {
      supabase.auth.getSession.mockResolvedValue({
        data: { session: { access_token: 'sb-test-token' } },
      });
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 1, name: 'User' }),
      });

      const { auth } = await import('../lib/api');
      await auth.me();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer sb-test-token',
          }),
        })
      );
    });

    it('does not include Authorization header when no session', async () => {
      supabase.auth.getSession.mockResolvedValue({ data: { session: null } });
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 1, name: 'User' }),
      });

      const { auth } = await import('../lib/api');
      await auth.me();

      const fetchCall = global.fetch.mock.calls[0];
      expect(fetchCall[1].headers.Authorization).toBeUndefined();
    });

    it('sets Content-Type to application/json for non-FormData', async () => {
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: { session: { access_token: 'token' } },
        error: null,
      });
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 1, name: 'User' }),
      });

      const { auth } = await import('../lib/api');
      await auth.login('test@example.com', 'password');

      // The login calls supabase.auth.signInWithPassword, then fetch for /auth/me
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/me'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('throws error on non-ok response', async () => {
      supabase.auth.getSession.mockResolvedValue({
        data: { session: { access_token: 'token' } },
      });
      global.fetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Not found' }),
      });

      const { auth } = await import('../lib/api');

      await expect(auth.me()).rejects.toThrow('Not found');
    });

    it('handles error response without json body', async () => {
      supabase.auth.getSession.mockResolvedValue({
        data: { session: { access_token: 'token' } },
      });
      global.fetch.mockResolvedValue({
        ok: false,
        json: () => Promise.reject(new Error('No JSON')),
      });

      const { auth } = await import('../lib/api');

      await expect(auth.me()).rejects.toThrow('Request failed');
    });
  });

  describe('auth API', () => {
    it('login calls Supabase signInWithPassword and fetches user', async () => {
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: { session: { access_token: 'sb-token' } },
        error: null,
      });
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 1, name: 'Test User' }),
      });

      const { auth } = await import('../lib/api');
      const result = await auth.login('test@example.com', 'password123');

      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/me'),
        expect.any(Object)
      );
      expect(result.user).toEqual({ id: 1, name: 'Test User' });
    });

    it('login throws when Supabase returns error', async () => {
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: {},
        error: { message: 'Invalid credentials' },
      });

      const { auth } = await import('../lib/api');

      await expect(auth.login('test@example.com', 'wrong')).rejects.toThrow(
        'Invalid credentials'
      );
    });

    it('register throws (registration disabled)', async () => {
      const { auth } = await import('../lib/api');

      await expect(auth.register('test@example.com', 'pass', 'User')).rejects.toThrow(
        /disabled/i
      );
    });

    it('me calls correct endpoint', async () => {
      supabase.auth.getSession.mockResolvedValue({
        data: { session: { access_token: 'token' } },
      });
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
    beforeEach(() => {
      supabase.auth.getSession.mockResolvedValue({
        data: { session: { access_token: 'token' } },
      });
    });

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
    beforeEach(() => {
      supabase.auth.getSession.mockResolvedValue({
        data: { session: { access_token: 'token' } },
      });
    });

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
    beforeEach(() => {
      supabase.auth.getSession.mockResolvedValue({
        data: { session: { access_token: 'token' } },
      });
    });

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
