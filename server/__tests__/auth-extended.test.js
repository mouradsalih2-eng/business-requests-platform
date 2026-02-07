import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import supertest from 'supertest';
import express from 'express';

const JWT_SECRET = 'test-secret';

// ── Declare mock objects OUTSIDE factories so test + middleware share the same refs ──

const mockGetUser = jest.fn();

const mockSupabase = {
  auth: {
    getUser: mockGetUser,
    admin: {
      createUser: jest.fn(),
      updateUserById: jest.fn(),
      deleteUser: jest.fn(),
      listUsers: jest.fn(),
    },
  },
};

const mockSupabaseAnon = {
  auth: {
    signInWithPassword: jest.fn(),
  },
};

const mockUserRepository = {
  findByAuthId: jest.fn(),
  findById: jest.fn(),
  findByEmail: jest.fn(),
  create: jest.fn(),
};

const mockPendingRegistrationRepository = {
  findByEmail: jest.fn(),
  findByEmailAndCode: jest.fn(),
  create: jest.fn(),
  updateCode: jest.fn(),
  delete: jest.fn(),
};

const mockVerificationCodeRepository = {
  findByEmailCodeType: jest.fn(),
  create: jest.fn(),
  deleteByEmailAndType: jest.fn(),
  delete: jest.fn(),
};

const mockPasswordResetRepository = {
  findByToken: jest.fn(),
  create: jest.fn(),
  deleteByUserId: jest.fn(),
  delete: jest.fn(),
};

const mockEmail = {
  sendVerificationEmail: jest.fn().mockResolvedValue({ success: true }),
  sendPasswordResetEmail: jest.fn().mockResolvedValue({ success: true }),
  generateVerificationCode: jest.fn().mockReturnValue('123456'),
  getCodeExpiration: jest.fn().mockReturnValue(new Date(Date.now() + 900000).toISOString()),
};

// ── Register mocks ──────────────────────────────────────────

jest.unstable_mockModule('../src/config/index.js', () => ({
  config: {
    supabase: { jwtSecret: JWT_SECRET },
    rateLimit: { auth: { windowMs: 1, max: 100 } },
  },
}));

jest.unstable_mockModule('../src/db/supabase.js', () => ({
  supabase: mockSupabase,
  supabaseAnon: mockSupabaseAnon,
}));

jest.unstable_mockModule('../src/repositories/userRepository.js', () => ({
  userRepository: mockUserRepository,
}));

jest.unstable_mockModule('../src/repositories/authRepository.js', () => ({
  pendingRegistrationRepository: mockPendingRegistrationRepository,
  verificationCodeRepository: mockVerificationCodeRepository,
  passwordResetRepository: mockPasswordResetRepository,
}));

jest.unstable_mockModule('../src/services/email.js', () => mockEmail);

jest.unstable_mockModule('../src/validation/schemas.js', () => ({
  forgotPasswordSchema: { parse: jest.fn((d) => d) },
  resetPasswordSchema: { parse: jest.fn((d) => d) },
}));

// ── Dynamic imports after mocks ──────────────────────────────

const { default: authRoutes } = await import('../src/routes/auth.js');
const { errorHandler } = await import('../src/middleware/errorHandler.js');

const app = express();
app.use(express.json());
app.use('/auth', authRoutes);
app.use(errorHandler);

const request = supertest(app);

const testUser = { id: 1, email: 'user@test.com', name: 'Test User', role: 'employee', auth_id: 'uuid-user-123', profile_picture: null, theme_preference: 'light' };

const generateToken = (user) => jwt.sign({ sub: user.auth_id, email: user.email, role: 'authenticated' }, JWT_SECRET);

describe('Auth Extended Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mockGetUser: decode the JWT to extract the sub (auth_id)
    mockGetUser.mockImplementation((token) => {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return { data: { user: { id: decoded.sub } }, error: null };
      } catch {
        return { data: { user: null }, error: { message: 'Invalid token' } };
      }
    });
  });

  describe('Registration Flow', () => {
    describe('POST /auth/register/initiate', () => {
      it('should initiate registration successfully', async () => {
        mockUserRepository.findByEmail.mockResolvedValue(null);
        mockPendingRegistrationRepository.findByEmail.mockResolvedValue(null);
        mockSupabase.auth.admin.createUser.mockResolvedValue({
          data: { user: { id: 'new-uuid-123' } },
          error: null,
        });

        const res = await request.post('/auth/register/initiate').send({
          email: 'new@test.com', password: 'pass123', name: 'New User',
        });
        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/verification/i);
        expect(mockSupabase.auth.admin.createUser).toHaveBeenCalledWith(
          expect.objectContaining({ email: 'new@test.com', email_confirm: false })
        );
        expect(mockEmail.sendVerificationEmail).toHaveBeenCalled();
      });

      it('should return 400 if email already exists', async () => {
        mockUserRepository.findByEmail.mockResolvedValue({ id: 1 });
        const res = await request.post('/auth/register/initiate').send({
          email: 'existing@test.com', password: 'pass123', name: 'User',
        });
        expect(res.status).toBe(400);
      });

      it('should clean up previous pending registration', async () => {
        mockUserRepository.findByEmail.mockResolvedValue(null);
        mockPendingRegistrationRepository.findByEmail.mockResolvedValue({ id: 5, auth_id: 'old-uuid' });
        mockSupabase.auth.admin.deleteUser.mockResolvedValue({});
        mockSupabase.auth.admin.createUser.mockResolvedValue({
          data: { user: { id: 'new-uuid-456' } },
          error: null,
        });

        const res = await request.post('/auth/register/initiate').send({
          email: 'retry@test.com', password: 'pass123', name: 'Retry User',
        });
        expect(res.status).toBe(200);
        expect(mockSupabase.auth.admin.deleteUser).toHaveBeenCalledWith('old-uuid');
        expect(mockPendingRegistrationRepository.delete).toHaveBeenCalledWith(5);
      });

      it('should return 400 for missing fields', async () => {
        const res = await request.post('/auth/register/initiate').send({ email: 'new@test.com' });
        expect(res.status).toBe(400);
      });

      it('should return 400 for invalid email', async () => {
        const res = await request.post('/auth/register/initiate').send({
          email: 'not-an-email', password: 'pass123', name: 'User',
        });
        expect(res.status).toBe(400);
      });
    });

    describe('POST /auth/register/verify', () => {
      it('should verify and create user successfully', async () => {
        const futureDate = new Date(Date.now() + 600000).toISOString();
        mockPendingRegistrationRepository.findByEmailAndCode.mockResolvedValue({
          id: 1, email: 'new@test.com', name: 'New User', auth_id: 'uuid-new-123', expires_at: futureDate,
        });
        mockSupabase.auth.admin.updateUserById.mockResolvedValue({ error: null });
        mockUserRepository.create.mockResolvedValue({ id: 10, email: 'new@test.com', name: 'New User', role: 'employee' });

        const res = await request.post('/auth/register/verify').send({ email: 'new@test.com', code: '123456' });
        expect(res.status).toBe(200);
        expect(res.body.user).toBeDefined();
        expect(res.body.user.email).toBe('new@test.com');
        expect(mockSupabase.auth.admin.updateUserById).toHaveBeenCalledWith('uuid-new-123', { email_confirm: true });
        expect(mockUserRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({ auth_id: 'uuid-new-123' })
        );
        expect(mockPendingRegistrationRepository.delete).toHaveBeenCalledWith(1);
      });

      it('should return 400 for invalid code', async () => {
        mockPendingRegistrationRepository.findByEmailAndCode.mockResolvedValue(null);
        const res = await request.post('/auth/register/verify').send({ email: 'new@test.com', code: '000000' });
        expect(res.status).toBe(400);
      });

      it('should return 400 for expired code', async () => {
        const pastDate = new Date(Date.now() - 60000).toISOString();
        mockPendingRegistrationRepository.findByEmailAndCode.mockResolvedValue({
          id: 1, email: 'new@test.com', auth_id: 'uuid-expired', expires_at: pastDate,
        });
        mockSupabase.auth.admin.deleteUser.mockResolvedValue({});

        const res = await request.post('/auth/register/verify').send({ email: 'new@test.com', code: '123456' });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/expired/i);
      });
    });

    describe('POST /auth/register/resend', () => {
      it('should resend code successfully', async () => {
        mockPendingRegistrationRepository.findByEmail.mockResolvedValue({ id: 1, email: 'new@test.com' });

        const res = await request.post('/auth/register/resend').send({ email: 'new@test.com' });
        expect(res.status).toBe(200);
        expect(mockEmail.sendVerificationEmail).toHaveBeenCalled();
      });

      it('should return 400 when no pending registration', async () => {
        mockPendingRegistrationRepository.findByEmail.mockResolvedValue(null);
        const res = await request.post('/auth/register/resend').send({ email: 'unknown@test.com' });
        expect(res.status).toBe(400);
      });
    });
  });

  describe('Password Change Flow', () => {
    describe('POST /auth/password/request-change', () => {
      it('should send verification code for password change', async () => {
        const token = generateToken(testUser);
        mockUserRepository.findByAuthId.mockResolvedValue(testUser);
        mockUserRepository.findById.mockResolvedValue(testUser);
        mockSupabaseAnon.auth.signInWithPassword.mockResolvedValue({ data: {}, error: null });

        const res = await request
          .post('/auth/password/request-change')
          .set('Authorization', `Bearer ${token}`)
          .send({ old_password: 'oldpass', new_password: 'newpass123' });

        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/verification/i);
        expect(mockSupabaseAnon.auth.signInWithPassword).toHaveBeenCalledWith({
          email: testUser.email,
          password: 'oldpass',
        });
      });

      it('should return 400 for wrong current password', async () => {
        const token = generateToken(testUser);
        mockUserRepository.findByAuthId.mockResolvedValue(testUser);
        mockUserRepository.findById.mockResolvedValue(testUser);
        mockSupabaseAnon.auth.signInWithPassword.mockResolvedValue({
          data: {}, error: { message: 'Invalid credentials' },
        });

        const res = await request
          .post('/auth/password/request-change')
          .set('Authorization', `Bearer ${token}`)
          .send({ old_password: 'wrongpass', new_password: 'newpass123' });

        expect(res.status).toBe(400);
      });

      it('should return 400 for short new password', async () => {
        const token = generateToken(testUser);
        mockUserRepository.findByAuthId.mockResolvedValue(testUser);

        const res = await request
          .post('/auth/password/request-change')
          .set('Authorization', `Bearer ${token}`)
          .send({ old_password: 'oldpass', new_password: 'ab' });

        expect(res.status).toBe(400);
      });
    });

    describe('POST /auth/password/change', () => {
      it('should change password successfully', async () => {
        const token = generateToken(testUser);
        mockUserRepository.findByAuthId.mockResolvedValue(testUser);
        mockUserRepository.findById.mockResolvedValue(testUser);
        mockVerificationCodeRepository.findByEmailCodeType.mockResolvedValue({
          id: 1, email: testUser.email, code: '123456', type: 'password_change',
          expires_at: new Date(Date.now() + 600000).toISOString(),
        });
        mockSupabase.auth.admin.updateUserById.mockResolvedValue({ error: null });

        const res = await request
          .post('/auth/password/change')
          .set('Authorization', `Bearer ${token}`)
          .send({ code: '123456', new_password: 'newpass123' });

        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/changed/i);
        expect(mockSupabase.auth.admin.updateUserById).toHaveBeenCalledWith(testUser.auth_id, { password: 'newpass123' });
      });

      it('should return 400 for invalid code', async () => {
        const token = generateToken(testUser);
        mockUserRepository.findByAuthId.mockResolvedValue(testUser);
        mockUserRepository.findById.mockResolvedValue(testUser);
        mockVerificationCodeRepository.findByEmailCodeType.mockResolvedValue(null);

        const res = await request
          .post('/auth/password/change')
          .set('Authorization', `Bearer ${token}`)
          .send({ code: '000000', new_password: 'newpass123' });

        expect(res.status).toBe(400);
      });

      it('should return 400 for missing new_password', async () => {
        const token = generateToken(testUser);
        mockUserRepository.findByAuthId.mockResolvedValue(testUser);

        const res = await request
          .post('/auth/password/change')
          .set('Authorization', `Bearer ${token}`)
          .send({ code: '123456' });

        expect(res.status).toBe(400);
      });
    });
  });

  describe('Forgot/Reset Password', () => {
    describe('POST /auth/forgot-password', () => {
      it('should send reset email for existing user', async () => {
        mockUserRepository.findByEmail.mockResolvedValue({ ...testUser, name: 'Test User' });

        const res = await request.post('/auth/forgot-password').send({ email: 'user@test.com' });
        expect(res.status).toBe(200);
        expect(mockEmail.sendPasswordResetEmail).toHaveBeenCalled();
      });

      it('should return generic message for non-existent email', async () => {
        mockUserRepository.findByEmail.mockResolvedValue(null);

        const res = await request.post('/auth/forgot-password').send({ email: 'unknown@test.com' });
        expect(res.status).toBe(200);
        expect(mockEmail.sendPasswordResetEmail).not.toHaveBeenCalled();
      });
    });

    describe('POST /auth/reset-password', () => {
      it('should reset password successfully', async () => {
        mockPasswordResetRepository.findByToken.mockResolvedValue({
          id: 1, user_id: testUser.id, token: 'reset-token',
          expires_at: new Date(Date.now() + 3600000).toISOString(),
        });
        mockUserRepository.findById.mockResolvedValue(testUser);
        mockSupabase.auth.admin.updateUserById.mockResolvedValue({ error: null });

        const res = await request.post('/auth/reset-password').send({ token: 'reset-token', password: 'newpass123' });
        expect(res.status).toBe(200);
        expect(mockSupabase.auth.admin.updateUserById).toHaveBeenCalledWith(testUser.auth_id, { password: 'newpass123' });
      });

      it('should return 400 for invalid token', async () => {
        mockPasswordResetRepository.findByToken.mockResolvedValue(null);
        const res = await request.post('/auth/reset-password').send({ token: 'bad-token', password: 'newpass123' });
        expect(res.status).toBe(400);
      });

      it('should return 400 for expired token', async () => {
        mockPasswordResetRepository.findByToken.mockResolvedValue({
          id: 1, user_id: testUser.id, token: 'expired-token',
          expires_at: new Date(Date.now() - 60000).toISOString(),
        });

        const res = await request.post('/auth/reset-password').send({ token: 'expired-token', password: 'newpass123' });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/expired/i);
      });
    });
  });
});
