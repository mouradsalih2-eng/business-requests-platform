import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// Mock the database
const mockDb = {
  get: jest.fn(),
  all: jest.fn(),
  run: jest.fn(),
};

// Mock JWT_SECRET
const JWT_SECRET = 'test-secret';

// Mock fs module
const mockFs = {
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  unlinkSync: jest.fn(),
};

jest.unstable_mockModule('../src/db/database.js', () => ({
  default: mockDb,
  initializeDatabase: jest.fn(),
}));

jest.unstable_mockModule('../src/middleware/auth.js', () => ({
  JWT_SECRET,
  authenticateToken: (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access denied' });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
  },
  requireAdmin: (req, res, next) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  },
}));

jest.unstable_mockModule('fs', () => ({
  default: mockFs,
  existsSync: mockFs.existsSync,
  mkdirSync: mockFs.mkdirSync,
  unlinkSync: mockFs.unlinkSync,
}));

// Import router after mocks
const { default: usersRoutes } = await import('../src/routes/users.js');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/users', usersRoutes);

// Helper to generate tokens
const generateToken = (user) => jwt.sign(user, JWT_SECRET);

describe('User Settings API', () => {
  const userToken = generateToken({ id: 1, email: 'user@example.com', role: 'user' });

  beforeEach(() => {
    jest.clearAllMocks();
    mockFs.existsSync.mockReturnValue(true);
  });

  describe('GET /api/users/me/settings', () => {
    it('returns 401 without authentication', async () => {
      const response = await request(app).get('/api/users/me/settings');
      expect(response.status).toBe(401);
    });

    it('returns 404 if user not found', async () => {
      mockDb.get.mockReturnValue(null);

      const response = await request(app)
        .get('/api/users/me/settings')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('User not found');
    });

    it('returns user settings successfully', async () => {
      mockDb.get.mockReturnValue({
        id: 1,
        email: 'user@example.com',
        name: 'Test User',
        profile_picture: '/uploads/avatars/user-1.jpg',
        theme_preference: 'dark',
      });

      const response = await request(app)
        .get('/api/users/me/settings')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.email).toBe('user@example.com');
      expect(response.body.theme_preference).toBe('dark');
      expect(response.body.profile_picture).toBeDefined();
    });

    it('returns user settings with null profile picture', async () => {
      mockDb.get.mockReturnValue({
        id: 1,
        email: 'user@example.com',
        name: 'Test User',
        profile_picture: null,
        theme_preference: 'system',
      });

      const response = await request(app)
        .get('/api/users/me/settings')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.profile_picture).toBeNull();
    });
  });

  describe('PATCH /api/users/me/settings', () => {
    it('returns 401 without authentication', async () => {
      const response = await request(app)
        .patch('/api/users/me/settings')
        .send({ theme_preference: 'dark' });

      expect(response.status).toBe(401);
    });

    it('returns 400 for invalid theme preference', async () => {
      const response = await request(app)
        .patch('/api/users/me/settings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ theme_preference: 'invalid' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid theme');
    });

    it('updates theme to light successfully', async () => {
      mockDb.get.mockReturnValue({
        id: 1,
        email: 'user@example.com',
        name: 'Test User',
        profile_picture: null,
        theme_preference: 'light',
      });
      mockDb.run.mockReturnValue({ changes: 1 });

      const response = await request(app)
        .patch('/api/users/me/settings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ theme_preference: 'light' });

      expect(response.status).toBe(200);
      expect(response.body.theme_preference).toBe('light');
    });

    it('updates theme to dark successfully', async () => {
      mockDb.get.mockReturnValue({
        id: 1,
        email: 'user@example.com',
        name: 'Test User',
        profile_picture: null,
        theme_preference: 'dark',
      });
      mockDb.run.mockReturnValue({ changes: 1 });

      const response = await request(app)
        .patch('/api/users/me/settings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ theme_preference: 'dark' });

      expect(response.status).toBe(200);
      expect(response.body.theme_preference).toBe('dark');
    });

    it('updates theme to system successfully', async () => {
      mockDb.get.mockReturnValue({
        id: 1,
        email: 'user@example.com',
        name: 'Test User',
        profile_picture: null,
        theme_preference: 'system',
      });
      mockDb.run.mockReturnValue({ changes: 1 });

      const response = await request(app)
        .patch('/api/users/me/settings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ theme_preference: 'system' });

      expect(response.status).toBe(200);
      expect(response.body.theme_preference).toBe('system');
    });

    it('returns current settings when no update provided', async () => {
      mockDb.get.mockReturnValue({
        id: 1,
        email: 'user@example.com',
        name: 'Test User',
        profile_picture: null,
        theme_preference: 'dark',
      });

      const response = await request(app)
        .patch('/api/users/me/settings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.theme_preference).toBe('dark');
    });
  });

  describe('DELETE /api/users/me/profile-picture', () => {
    it('returns 401 without authentication', async () => {
      const response = await request(app).delete('/api/users/me/profile-picture');
      expect(response.status).toBe(401);
    });

    it('deletes profile picture successfully when exists', async () => {
      mockDb.get.mockReturnValue({
        profile_picture: '/uploads/avatars/user-1-12345.jpg',
      });
      mockDb.run.mockReturnValue({ changes: 1 });
      mockFs.existsSync.mockReturnValue(true);

      const response = await request(app)
        .delete('/api/users/me/profile-picture')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('deleted');
      expect(mockFs.unlinkSync).toHaveBeenCalled();
    });

    it('handles deletion when no profile picture exists', async () => {
      mockDb.get.mockReturnValue({
        profile_picture: null,
      });
      mockDb.run.mockReturnValue({ changes: 1 });

      const response = await request(app)
        .delete('/api/users/me/profile-picture')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(mockFs.unlinkSync).not.toHaveBeenCalled();
    });

    it('handles file not found on disk gracefully', async () => {
      mockDb.get.mockReturnValue({
        profile_picture: '/uploads/avatars/missing.jpg',
      });
      mockDb.run.mockReturnValue({ changes: 1 });
      mockFs.existsSync.mockReturnValue(false);

      const response = await request(app)
        .delete('/api/users/me/profile-picture')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(mockFs.unlinkSync).not.toHaveBeenCalled();
    });
  });
});

describe('User Settings Edge Cases', () => {
  const userToken = generateToken({ id: 1, email: 'user@example.com', role: 'user' });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Theme preference validation', () => {
    // These are truly invalid values that should be rejected
    const invalidThemes = ['DARK', 'Light', 'SYSTEM', 'auto', 'default', 'blue'];

    invalidThemes.forEach(theme => {
      it(`rejects invalid theme: "${theme}"`, async () => {
        const response = await request(app)
          .patch('/api/users/me/settings')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ theme_preference: theme });

        expect(response.status).toBe(400);
      });
    });

    // Empty string is falsy so treated as "no update" (returns 200)
    it('treats empty string as no-op (returns 200)', async () => {
      mockDb.get.mockReturnValue({
        id: 1,
        email: 'user@example.com',
        name: 'Test',
        profile_picture: null,
        theme_preference: 'dark',
      });

      const response = await request(app)
        .patch('/api/users/me/settings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ theme_preference: '' });

      expect(response.status).toBe(200);
    });

    // Whitespace is truthy but invalid, so it's rejected
    it('rejects whitespace as invalid theme', async () => {
      const response = await request(app)
        .patch('/api/users/me/settings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ theme_preference: ' ' });

      expect(response.status).toBe(400);
    });

    const validThemes = ['light', 'dark', 'system'];

    validThemes.forEach(theme => {
      it(`accepts valid theme: "${theme}"`, async () => {
        mockDb.get.mockReturnValue({
          id: 1,
          email: 'user@example.com',
          name: 'Test',
          profile_picture: null,
          theme_preference: theme,
        });
        mockDb.run.mockReturnValue({ changes: 1 });

        const response = await request(app)
          .patch('/api/users/me/settings')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ theme_preference: theme });

        expect(response.status).toBe(200);
      });
    });
  });

  describe('Concurrent requests', () => {
    it('handles multiple settings updates', async () => {
      let callCount = 0;
      mockDb.get.mockImplementation(() => {
        callCount++;
        return {
          id: 1,
          email: 'user@example.com',
          name: 'Test',
          profile_picture: null,
          theme_preference: callCount <= 1 ? 'light' : 'dark',
        };
      });
      mockDb.run.mockReturnValue({ changes: 1 });

      const [response1, response2] = await Promise.all([
        request(app)
          .patch('/api/users/me/settings')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ theme_preference: 'dark' }),
        request(app)
          .patch('/api/users/me/settings')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ theme_preference: 'light' }),
      ]);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
    });
  });
});
