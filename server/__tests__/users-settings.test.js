import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// ── Constants ────────────────────────────────────────────────
const JWT_SECRET = 'test-secret';

// ── Mock repositories and services ──────────────────────────

const mockUserRepository = {
  findById: jest.fn(),
  findByIdOrFail: jest.fn(),
  findByEmail: jest.fn(),
  findAll: jest.fn(),
  findAllWithRequestCount: jest.fn(),
  search: jest.fn(),
  create: jest.fn(),
  updateRole: jest.fn(),
  updatePassword: jest.fn(),
  updateTheme: jest.fn(),
  updateSettings: jest.fn(),
  updateProfilePicture: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
  updateAuthId: jest.fn(),
  findAdmins: jest.fn(),
};

jest.unstable_mockModule('../src/repositories/userRepository.js', () => ({
  userRepository: mockUserRepository,
}));

jest.unstable_mockModule('../src/repositories/projectMemberRepository.js', () => ({
  projectMemberRepository: {
    addMember: jest.fn(),
    removeMember: jest.fn(),
    findByProjectAndUser: jest.fn(),
    findByProject: jest.fn(),
    updateRole: jest.fn(),
  },
}));

jest.unstable_mockModule('../src/db/supabase.js', () => ({
  supabase: {
    auth: {
      admin: {
        createUser: jest.fn().mockResolvedValue({ data: { user: { id: 'mock-uuid' } }, error: null }),
        updateUserById: jest.fn().mockResolvedValue({ error: null }),
        deleteUser: jest.fn().mockResolvedValue({ error: null }),
      },
    },
  },
  supabaseAnon: null,
}));

jest.unstable_mockModule('../src/services/seedService.js', () => ({
  seedDatabase: jest.fn(),
  unseedDatabase: jest.fn(),
}));

jest.unstable_mockModule('bcryptjs', () => ({
  default: {
    hash: jest.fn().mockResolvedValue('hashed_password'),
    compare: jest.fn(),
    compareSync: jest.fn(),
  },
}));

jest.unstable_mockModule('../src/middleware/auth.js', () => ({
  authenticateToken: (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access token required' });
    try {
      req.user = jwt.verify(token, JWT_SECRET);
      next();
    } catch {
      return res.status(403).json({ error: 'Invalid token' });
    }
  },
  requireAdmin: (req, res, next) => {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    next();
  },
}));

jest.unstable_mockModule('../src/middleware/project.js', () => ({
  requireSuperAdmin: (req, res, next) => {
    if (req.user?.role !== 'super_admin') return res.status(403).json({ error: 'Super admin access required' });
    next();
  },
  requireProject: (req, res, next) => next(),
  requireProjectAdmin: (req, res, next) => next(),
}));

// Mock storageService instead of fs (files are now in Supabase Storage)
const mockStorageService = {
  uploadAvatar: jest.fn(),
  deleteAvatar: jest.fn(),
  uploadAttachment: jest.fn(),
  deleteAttachments: jest.fn(),
};

jest.unstable_mockModule('../src/services/storageService.js', () => ({
  storageService: mockStorageService,
}));

// ── Import route and error infrastructure AFTER mocks ────────

const { default: usersRoutes } = await import('../src/routes/users.js');
const { errorHandler } = await import('../src/middleware/errorHandler.js');

// ── Create test Express app ──────────────────────────────────

const app = express();
app.use(express.json());
app.use('/api/users', usersRoutes);
app.use(errorHandler);

// ── Helpers ──────────────────────────────────────────────────

const generateToken = (payload) => jwt.sign(payload, JWT_SECRET);
const userToken = generateToken({ id: 1, email: 'user@example.com', role: 'employee' });

// ── Tests ────────────────────────────────────────────────────

describe('User Settings API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── GET /api/users/me/settings ─────────────────────────────

  describe('GET /api/users/me/settings', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app).get('/api/users/me/settings');
      expect(res.status).toBe(401);
    });

    it('returns 404 if user not found', async () => {
      const { NotFoundError } = await import('../src/errors/AppError.js');
      mockUserRepository.findByIdOrFail.mockRejectedValue(new NotFoundError('User'));

      const res = await request(app)
        .get('/api/users/me/settings')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('User not found');
    });

    it('returns user settings successfully', async () => {
      mockUserRepository.findByIdOrFail.mockResolvedValue({
        id: 1,
        email: 'user@example.com',
        name: 'Test User',
        profile_picture: 'https://example.supabase.co/storage/v1/object/public/avatars/1/avatar.jpg',
        theme_preference: 'dark',
      });

      const res = await request(app)
        .get('/api/users/me/settings')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.email).toBe('user@example.com');
      expect(res.body.theme_preference).toBe('dark');
      expect(res.body.profile_picture).toBe('https://example.supabase.co/storage/v1/object/public/avatars/1/avatar.jpg');
    });

    it('returns user settings with null profile picture', async () => {
      mockUserRepository.findByIdOrFail.mockResolvedValue({
        id: 1,
        email: 'user@example.com',
        name: 'Test User',
        profile_picture: null,
        theme_preference: 'system',
      });

      const res = await request(app)
        .get('/api/users/me/settings')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.profile_picture).toBeNull();
      expect(res.body.theme_preference).toBe('system');
    });

    it('calls findByIdOrFail with correct user id and columns', async () => {
      mockUserRepository.findByIdOrFail.mockResolvedValue({
        id: 1, email: 'user@example.com', name: 'Test', profile_picture: null, theme_preference: 'light',
      });

      await request(app)
        .get('/api/users/me/settings')
        .set('Authorization', `Bearer ${userToken}`);

      expect(mockUserRepository.findByIdOrFail).toHaveBeenCalledWith(
        1,
        'id, email, name, profile_picture, theme_preference, auto_watch_on_comment, auto_watch_on_vote, auth_provider'
      );
    });
  });

  // ── PATCH /api/users/me/settings ───────────────────────────

  describe('PATCH /api/users/me/settings', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app)
        .patch('/api/users/me/settings')
        .send({ theme_preference: 'dark' });

      expect(res.status).toBe(401);
    });

    it('returns 400 for invalid theme preference', async () => {
      const res = await request(app)
        .patch('/api/users/me/settings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ theme_preference: 'invalid' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid theme');
    });

    it('updates theme to light successfully', async () => {
      mockUserRepository.updateSettings.mockResolvedValue({
        id: 1, email: 'user@example.com', name: 'Test User',
        profile_picture: null, theme_preference: 'light',
      });

      const res = await request(app)
        .patch('/api/users/me/settings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ theme_preference: 'light' });

      expect(res.status).toBe(200);
      expect(res.body.theme_preference).toBe('light');
      expect(mockUserRepository.updateSettings).toHaveBeenCalledWith(1, { theme_preference: 'light' });
    });

    it('updates theme to dark successfully', async () => {
      mockUserRepository.updateSettings.mockResolvedValue({
        id: 1, email: 'user@example.com', name: 'Test User',
        profile_picture: null, theme_preference: 'dark',
      });

      const res = await request(app)
        .patch('/api/users/me/settings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ theme_preference: 'dark' });

      expect(res.status).toBe(200);
      expect(res.body.theme_preference).toBe('dark');
    });

    it('updates theme to system successfully', async () => {
      mockUserRepository.updateSettings.mockResolvedValue({
        id: 1, email: 'user@example.com', name: 'Test User',
        profile_picture: null, theme_preference: 'system',
      });

      const res = await request(app)
        .patch('/api/users/me/settings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ theme_preference: 'system' });

      expect(res.status).toBe(200);
      expect(res.body.theme_preference).toBe('system');
    });

    it('returns current settings when no theme_preference provided', async () => {
      mockUserRepository.findById.mockResolvedValue({
        id: 1, email: 'user@example.com', name: 'Test User',
        profile_picture: null, theme_preference: 'dark',
      });

      const res = await request(app)
        .patch('/api/users/me/settings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.theme_preference).toBe('dark');
      expect(mockUserRepository.updateSettings).not.toHaveBeenCalled();
      expect(mockUserRepository.findById).toHaveBeenCalledWith(1, 'id, email, name, profile_picture, theme_preference, auto_watch_on_comment, auto_watch_on_vote, auth_provider');
    });

    it('treats empty string theme as no-op (falsy)', async () => {
      mockUserRepository.findById.mockResolvedValue({
        id: 1, email: 'user@example.com', name: 'Test',
        profile_picture: null, theme_preference: 'dark',
      });

      const res = await request(app)
        .patch('/api/users/me/settings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ theme_preference: '' });

      expect(res.status).toBe(200);
      expect(mockUserRepository.updateSettings).not.toHaveBeenCalled();
    });
  });

  // ── Theme preference validation ────────────────────────────

  describe('Theme preference validation', () => {
    const invalidThemes = ['DARK', 'Light', 'SYSTEM', 'auto', 'default', 'blue', 'neon'];

    invalidThemes.forEach(theme => {
      it(`rejects invalid theme: "${theme}"`, async () => {
        const res = await request(app)
          .patch('/api/users/me/settings')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ theme_preference: theme });

        expect(res.status).toBe(400);
        expect(res.body.error).toContain('Invalid theme');
      });
    });

    it('rejects whitespace-only string as invalid theme', async () => {
      const res = await request(app)
        .patch('/api/users/me/settings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ theme_preference: '  ' });

      expect(res.status).toBe(400);
    });

    const validThemes = ['light', 'dark', 'system'];

    validThemes.forEach(theme => {
      it(`accepts valid theme: "${theme}"`, async () => {
        mockUserRepository.updateSettings.mockResolvedValue({
          id: 1, email: 'user@example.com', name: 'Test',
          profile_picture: null, theme_preference: theme,
        });

        const res = await request(app)
          .patch('/api/users/me/settings')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ theme_preference: theme });

        expect(res.status).toBe(200);
        expect(res.body.theme_preference).toBe(theme);
      });
    });
  });

  // ── DELETE /api/users/me/profile-picture ────────────────────

  describe('DELETE /api/users/me/profile-picture', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app).delete('/api/users/me/profile-picture');
      expect(res.status).toBe(401);
    });

    it('deletes profile picture from Supabase Storage', async () => {
      const avatarUrl = 'https://example.supabase.co/storage/v1/object/public/avatars/1/12345.jpg';
      mockUserRepository.findById.mockResolvedValue({
        profile_picture: avatarUrl,
      });
      mockStorageService.deleteAvatar.mockResolvedValue();
      mockUserRepository.updateProfilePicture.mockResolvedValue();

      const res = await request(app)
        .delete('/api/users/me/profile-picture')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('deleted');
      expect(mockStorageService.deleteAvatar).toHaveBeenCalledWith(avatarUrl);
      expect(mockUserRepository.updateProfilePicture).toHaveBeenCalledWith(1, null);
    });

    it('handles deletion when no profile picture exists', async () => {
      mockUserRepository.findById.mockResolvedValue({
        profile_picture: null,
      });
      mockUserRepository.updateProfilePicture.mockResolvedValue();

      const res = await request(app)
        .delete('/api/users/me/profile-picture')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(mockStorageService.deleteAvatar).not.toHaveBeenCalled();
    });
  });

  // ── Concurrent requests ────────────────────────────────────

  describe('Concurrent requests', () => {
    it('handles multiple simultaneous settings updates', async () => {
      mockUserRepository.updateSettings
        .mockResolvedValueOnce({
          id: 1, email: 'user@example.com', name: 'Test',
          profile_picture: null, theme_preference: 'dark',
        })
        .mockResolvedValueOnce({
          id: 1, email: 'user@example.com', name: 'Test',
          profile_picture: null, theme_preference: 'light',
        });

      const [res1, res2] = await Promise.all([
        request(app)
          .patch('/api/users/me/settings')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ theme_preference: 'dark' }),
        request(app)
          .patch('/api/users/me/settings')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ theme_preference: 'light' }),
      ]);

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
      expect(mockUserRepository.updateSettings).toHaveBeenCalledTimes(2);
    });
  });
});
