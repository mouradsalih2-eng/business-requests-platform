import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import supertest from 'supertest';
import express from 'express';

const JWT_SECRET = 'test-secret';

// ── Declare mock objects OUTSIDE factories ──────────────────

const mockSupabaseAnon = {
  auth: { signInWithPassword: jest.fn() },
};

const mockUserRepository = {
  findByAuthId: jest.fn(),
  findById: jest.fn(),
  findByEmail: jest.fn(),
  create: jest.fn(),
};

// ── Register mocks ──────────────────────────────────────────

jest.unstable_mockModule('../src/config/index.js', () => ({
  config: {
    supabase: { jwtSecret: JWT_SECRET },
    rateLimit: { auth: { windowMs: 1, max: 100 } },
  },
}));

jest.unstable_mockModule('../src/db/supabase.js', () => ({
  supabase: {
    auth: { admin: { createUser: jest.fn(), updateUserById: jest.fn(), deleteUser: jest.fn(), listUsers: jest.fn() } },
  },
  supabaseAnon: mockSupabaseAnon,
}));

jest.unstable_mockModule('../src/repositories/userRepository.js', () => ({
  userRepository: mockUserRepository,
}));

jest.unstable_mockModule('../src/repositories/authRepository.js', () => ({
  pendingRegistrationRepository: { findByEmail: jest.fn(), findByEmailAndCode: jest.fn(), create: jest.fn(), updateCode: jest.fn(), delete: jest.fn() },
  verificationCodeRepository: { findByEmailCodeType: jest.fn(), create: jest.fn(), deleteByEmailAndType: jest.fn(), delete: jest.fn() },
  passwordResetRepository: { findByToken: jest.fn(), create: jest.fn(), deleteByUserId: jest.fn(), delete: jest.fn() },
}));

jest.unstable_mockModule('../src/services/email.js', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue({ success: true }),
  sendPasswordResetEmail: jest.fn().mockResolvedValue({ success: true }),
  generateVerificationCode: jest.fn().mockReturnValue('123456'),
  getCodeExpiration: jest.fn().mockReturnValue(new Date(Date.now() + 900000).toISOString()),
}));

// Dynamic imports after mocks
const { default: authRoutes } = await import('../src/routes/auth.js');
const { errorHandler } = await import('../src/middleware/errorHandler.js');

// Build test app
const app = express();
app.use(express.json());
app.use('/auth', authRoutes);
app.use(errorHandler);

const request = supertest(app);

const adminUser = { id: 1, email: 'admin@test.com', name: 'Admin', role: 'admin', auth_id: 'uuid-admin-123', profile_picture: null, theme_preference: 'light' };
const employeeUser = { id: 2, email: 'user@test.com', name: 'User', role: 'employee', auth_id: 'uuid-user-456', profile_picture: null, theme_preference: 'light' };

const generateToken = (user) => jwt.sign({ sub: user.auth_id, email: user.email, role: 'authenticated' }, JWT_SECRET);

describe('Auth Routes', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('POST /auth/register', () => {
    it('should return 403 - registration disabled', async () => {
      const res = await request.post('/auth/register').send({ email: 'new@test.com', password: 'pass123', name: 'New' });
      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/disabled/i);
    });
  });

  describe('POST /auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      mockSupabaseAnon.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: { id: adminUser.auth_id },
          session: { access_token: 'sb-token-123', refresh_token: 'sb-refresh-123', expires_in: 3600, expires_at: Date.now() + 3600000 },
        },
        error: null,
      });
      mockUserRepository.findByAuthId.mockResolvedValue(adminUser);

      const res = await request.post('/auth/login').send({ email: 'admin@test.com', password: 'admin123' });
      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('admin@test.com');
      expect(res.body.token).toBe('sb-token-123');
      expect(res.body.session).toBeDefined();
      expect(res.body.session.access_token).toBe('sb-token-123');
    });

    it('should return 401 for invalid credentials', async () => {
      mockSupabaseAnon.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid credentials' },
      });

      const res = await request.post('/auth/login').send({ email: 'admin@test.com', password: 'wrong' });
      expect(res.status).toBe(401);
    });

    it('should return 400 when email or password missing', async () => {
      const res = await request.post('/auth/login').send({ email: 'admin@test.com' });
      expect(res.status).toBe(400);
    });

    it('should return 401 when Supabase user has no app account', async () => {
      mockSupabaseAnon.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: { id: 'unknown-uuid' },
          session: { access_token: 'token', refresh_token: 'refresh', expires_in: 3600, expires_at: 0 },
        },
        error: null,
      });
      mockUserRepository.findByAuthId.mockResolvedValue(null);

      const res = await request.post('/auth/login').send({ email: 'orphan@test.com', password: 'pass123' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /auth/me', () => {
    it('should return current user with valid token', async () => {
      const token = generateToken(adminUser);
      mockUserRepository.findByAuthId.mockResolvedValue(adminUser);
      mockUserRepository.findById.mockResolvedValue(adminUser);

      const res = await request.get('/auth/me').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.email).toBe('admin@test.com');
    });

    it('should return 401 without token', async () => {
      const res = await request.get('/auth/me');
      expect(res.status).toBe(401);
    });

    it('should return 401 with invalid token', async () => {
      const res = await request.get('/auth/me').set('Authorization', 'Bearer invalid-token');
      expect(res.status).toBe(401);
    });

    it('should return 401 when user not found by auth_id', async () => {
      const token = jwt.sign({ sub: 'nonexistent-uuid', email: 'ghost@test.com', role: 'authenticated' }, JWT_SECRET);
      mockUserRepository.findByAuthId.mockResolvedValue(null);

      const res = await request.get('/auth/me').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(401);
    });
  });
});
