import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Mock the database
const mockDb = {
  get: jest.fn(),
  all: jest.fn(),
  run: jest.fn(),
};

// Mock JWT_SECRET
const JWT_SECRET = 'test-secret';

// Mock email service
const mockSendVerificationEmail = jest.fn();
const mockSendPasswordResetEmail = jest.fn();
const mockGenerateVerificationCode = jest.fn();
const mockGetCodeExpiration = jest.fn();

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
}));

jest.unstable_mockModule('../src/services/email.js', () => ({
  sendVerificationEmail: mockSendVerificationEmail,
  sendPasswordResetEmail: mockSendPasswordResetEmail,
  generateVerificationCode: mockGenerateVerificationCode,
  getCodeExpiration: mockGetCodeExpiration,
}));

jest.unstable_mockModule('../src/middleware/validate.js', () => ({
  validateBody: () => (req, res, next) => next(),
}));

// Import router after mocks
const { default: authRoutes } = await import('../src/routes/auth.js');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

// Helper to generate tokens
const generateToken = (user) => jwt.sign(user, JWT_SECRET);

describe('Auth Extended API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGenerateVerificationCode.mockReturnValue('123456');
    mockGetCodeExpiration.mockReturnValue(new Date(Date.now() + 15 * 60 * 1000).toISOString());
    mockSendVerificationEmail.mockResolvedValue({ success: true });
    mockSendPasswordResetEmail.mockResolvedValue({ success: true });
  });

  describe('POST /api/auth/register/initiate', () => {
    it('returns 400 if email is missing', async () => {
      const response = await request(app)
        .post('/api/auth/register/initiate')
        .send({ password: 'password123', name: 'Test User' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    it('returns 400 if password is missing', async () => {
      const response = await request(app)
        .post('/api/auth/register/initiate')
        .send({ email: 'test@example.com', name: 'Test User' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    it('returns 400 if name is missing', async () => {
      const response = await request(app)
        .post('/api/auth/register/initiate')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    it('returns 400 for invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/register/initiate')
        .send({ email: 'invalid-email', password: 'password123', name: 'Test' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('valid email');
    });

    it('returns 400 if user already exists', async () => {
      mockDb.get.mockReturnValue({ id: 1, email: 'existing@example.com' });

      const response = await request(app)
        .post('/api/auth/register/initiate')
        .send({ email: 'existing@example.com', password: 'password123', name: 'Test' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('already exists');
    });

    it('initiates registration successfully', async () => {
      mockDb.get.mockReturnValue(null); // No existing user
      mockDb.run.mockReturnValue({ changes: 1 });

      const response = await request(app)
        .post('/api/auth/register/initiate')
        .send({ email: 'new@example.com', password: 'password123', name: 'New User' });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('Verification code sent');
      expect(mockSendVerificationEmail).toHaveBeenCalledWith('new@example.com', '123456', 'registration');
    });

    it('deletes existing pending registration before creating new one', async () => {
      mockDb.get.mockReturnValue(null);
      mockDb.run.mockReturnValue({ changes: 1 });

      await request(app)
        .post('/api/auth/register/initiate')
        .send({ email: 'test@example.com', password: 'password123', name: 'Test' });

      // Check that DELETE was called for pending_registrations
      const deleteCall = mockDb.run.mock.calls.find(call =>
        call[0].includes('DELETE FROM pending_registrations')
      );
      expect(deleteCall).toBeDefined();
    });
  });

  describe('POST /api/auth/register/verify', () => {
    it('returns 400 if email is missing', async () => {
      const response = await request(app)
        .post('/api/auth/register/verify')
        .send({ code: '123456' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    it('returns 400 if code is missing', async () => {
      const response = await request(app)
        .post('/api/auth/register/verify')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    it('returns 400 for invalid verification code', async () => {
      mockDb.get.mockReturnValue(null); // No matching pending registration

      const response = await request(app)
        .post('/api/auth/register/verify')
        .send({ email: 'test@example.com', code: 'wrong' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid verification code');
    });

    it('returns 400 if code has expired', async () => {
      const expiredDate = new Date(Date.now() - 60 * 1000).toISOString(); // 1 minute ago
      mockDb.get.mockReturnValue({
        id: 1,
        email: 'test@example.com',
        password_hash: 'hashed',
        name: 'Test',
        verification_code: '123456',
        expires_at: expiredDate,
      });

      const response = await request(app)
        .post('/api/auth/register/verify')
        .send({ email: 'test@example.com', code: '123456' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('expired');
    });

    it('verifies registration and creates user successfully', async () => {
      const futureDate = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      mockDb.get
        .mockReturnValueOnce({
          id: 1,
          email: 'test@example.com',
          password_hash: 'hashed_password',
          name: 'Test User',
          verification_code: '123456',
          expires_at: futureDate,
        })
        .mockReturnValueOnce({
          id: 10,
          email: 'test@example.com',
          name: 'Test User',
          role: 'employee',
          created_at: new Date().toISOString(),
        });

      mockDb.run.mockReturnValue({ lastInsertRowid: 10 });

      const response = await request(app)
        .post('/api/auth/register/verify')
        .send({ email: 'test@example.com', code: '123456' });

      expect(response.status).toBe(200);
      expect(response.body.user).toBeDefined();
      expect(response.body.token).toBeDefined();
      expect(response.body.user.email).toBe('test@example.com');
    });
  });

  describe('POST /api/auth/register/resend', () => {
    it('returns 400 if email is missing', async () => {
      const response = await request(app)
        .post('/api/auth/register/resend')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    it('returns 400 if no pending registration found', async () => {
      mockDb.get.mockReturnValue(null);

      const response = await request(app)
        .post('/api/auth/register/resend')
        .send({ email: 'notfound@example.com' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('No pending registration');
    });

    it('resends verification code successfully', async () => {
      mockDb.get.mockReturnValue({
        id: 1,
        email: 'test@example.com',
        verification_code: 'old_code',
      });
      mockDb.run.mockReturnValue({ changes: 1 });

      const response = await request(app)
        .post('/api/auth/register/resend')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('resent');
      expect(mockSendVerificationEmail).toHaveBeenCalled();
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('returns success even if user not found (prevent enumeration)', async () => {
      mockDb.get.mockReturnValue(null);

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'notfound@example.com' });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('If an account exists');
      expect(mockSendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('sends password reset email when user exists', async () => {
      mockDb.get.mockReturnValue({
        id: 1,
        email: 'user@example.com',
        name: 'Test User',
      });
      mockDb.run.mockReturnValue({ changes: 1 });

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'user@example.com' });

      expect(response.status).toBe(200);
      expect(mockSendPasswordResetEmail).toHaveBeenCalledWith(
        'user@example.com',
        expect.any(String),
        'Test User'
      );
    });

    it('deletes existing tokens before creating new one', async () => {
      mockDb.get.mockReturnValue({ id: 1, email: 'user@example.com', name: 'Test' });
      mockDb.run.mockReturnValue({ changes: 1 });

      await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'user@example.com' });

      const deleteCall = mockDb.run.mock.calls.find(call =>
        call[0].includes('DELETE FROM password_reset_tokens')
      );
      expect(deleteCall).toBeDefined();
    });
  });

  describe('POST /api/auth/reset-password', () => {
    it('returns 400 for invalid token', async () => {
      mockDb.get.mockReturnValue(null);

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'invalid-token', password: 'newpassword123' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid or expired');
    });

    it('returns 400 if token has expired', async () => {
      const expiredDate = new Date(Date.now() - 60 * 1000).toISOString();
      mockDb.get.mockReturnValue({
        id: 1,
        user_id: 5,
        token: 'valid-token',
        expires_at: expiredDate,
      });

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'valid-token', password: 'newpassword123' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('expired');
    });

    it('resets password successfully', async () => {
      const futureDate = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      mockDb.get.mockReturnValue({
        id: 1,
        user_id: 5,
        token: 'valid-token',
        expires_at: futureDate,
      });
      mockDb.run.mockReturnValue({ changes: 1 });

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'valid-token', password: 'newpassword123' });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('successfully');

      // Verify password was updated
      const updateCall = mockDb.run.mock.calls.find(call =>
        call[0].includes('UPDATE users SET password')
      );
      expect(updateCall).toBeDefined();
    });

    it('deletes all reset tokens for user after successful reset', async () => {
      const futureDate = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      mockDb.get.mockReturnValue({
        id: 1,
        user_id: 5,
        token: 'valid-token',
        expires_at: futureDate,
      });
      mockDb.run.mockReturnValue({ changes: 1 });

      await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'valid-token', password: 'newpassword123' });

      // Should delete by id and by user_id
      const deleteCalls = mockDb.run.mock.calls.filter(call =>
        call[0].includes('DELETE FROM password_reset_tokens')
      );
      expect(deleteCalls.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('POST /api/auth/password/request-change', () => {
    const userToken = generateToken({ id: 1, email: 'user@example.com', role: 'user' });

    it('returns 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/auth/password/request-change')
        .send({ old_password: 'old', new_password: 'newpass123' });

      expect(response.status).toBe(401);
    });

    it('returns 400 if old_password is missing', async () => {
      const response = await request(app)
        .post('/api/auth/password/request-change')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ new_password: 'newpass123' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    it('returns 400 if new_password is missing', async () => {
      const response = await request(app)
        .post('/api/auth/password/request-change')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ old_password: 'oldpass123' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    it('returns 400 if new_password is too short', async () => {
      const response = await request(app)
        .post('/api/auth/password/request-change')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ old_password: 'oldpass123', new_password: '12345' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('6 characters');
    });

    it('returns 404 if user not found', async () => {
      mockDb.get.mockReturnValue(null);

      const response = await request(app)
        .post('/api/auth/password/request-change')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ old_password: 'oldpass123', new_password: 'newpass123' });

      expect(response.status).toBe(404);
    });

    it('returns 400 if old password is incorrect', async () => {
      const hashedPassword = bcrypt.hashSync('correctpassword', 10);
      mockDb.get.mockReturnValue({
        id: 1,
        email: 'user@example.com',
        password: hashedPassword,
      });

      const response = await request(app)
        .post('/api/auth/password/request-change')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ old_password: 'wrongpassword', new_password: 'newpass123' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('incorrect');
    });

    it('sends verification code when old password is correct', async () => {
      const hashedPassword = bcrypt.hashSync('oldpass123', 10);
      mockDb.get.mockReturnValue({
        id: 1,
        email: 'user@example.com',
        password: hashedPassword,
      });
      mockDb.run.mockReturnValue({ changes: 1 });

      const response = await request(app)
        .post('/api/auth/password/request-change')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ old_password: 'oldpass123', new_password: 'newpass123' });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('Verification code sent');
      expect(mockSendVerificationEmail).toHaveBeenCalledWith(
        'user@example.com',
        '123456',
        'password_change'
      );
    });
  });

  describe('POST /api/auth/password/change', () => {
    const userToken = generateToken({ id: 1, email: 'user@example.com', role: 'user' });

    it('returns 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/auth/password/change')
        .send({ code: '123456' });

      expect(response.status).toBe(401);
    });

    it('returns 400 if code is missing', async () => {
      const response = await request(app)
        .post('/api/auth/password/change')
        .set('Authorization', `Bearer ${userToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    it('returns 404 if user not found', async () => {
      mockDb.get.mockReturnValue(null);

      const response = await request(app)
        .post('/api/auth/password/change')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ code: '123456' });

      expect(response.status).toBe(404);
    });

    it('returns 400 for invalid verification code', async () => {
      mockDb.get
        .mockReturnValueOnce({ id: 1, email: 'user@example.com' }) // user found
        .mockReturnValueOnce(null); // no verification code

      const response = await request(app)
        .post('/api/auth/password/change')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ code: 'wrongcode' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid verification code');
    });

    it('returns 400 if verification code has expired', async () => {
      const expiredDate = new Date(Date.now() - 60 * 1000).toISOString();
      mockDb.get
        .mockReturnValueOnce({ id: 1, email: 'user@example.com' })
        .mockReturnValueOnce({
          id: 1,
          email: 'user@example.com',
          code: '123456',
          type: 'password_change',
          expires_at: expiredDate,
          pending_data: 'hashed_new_password',
        });

      const response = await request(app)
        .post('/api/auth/password/change')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ code: '123456' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('expired');
    });

    it('returns 400 if pending_data is missing', async () => {
      const futureDate = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      mockDb.get
        .mockReturnValueOnce({ id: 1, email: 'user@example.com' })
        .mockReturnValueOnce({
          id: 1,
          email: 'user@example.com',
          code: '123456',
          type: 'password_change',
          expires_at: futureDate,
          pending_data: null, // missing
        });

      const response = await request(app)
        .post('/api/auth/password/change')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ code: '123456' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('invalid');
    });

    it('changes password successfully', async () => {
      const futureDate = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      mockDb.get
        .mockReturnValueOnce({ id: 1, email: 'user@example.com' })
        .mockReturnValueOnce({
          id: 1,
          email: 'user@example.com',
          code: '123456',
          type: 'password_change',
          expires_at: futureDate,
          pending_data: 'hashed_new_password',
        });
      mockDb.run.mockReturnValue({ changes: 1 });

      const response = await request(app)
        .post('/api/auth/password/change')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ code: '123456' });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('successfully');

      // Verify password was updated
      const updateCall = mockDb.run.mock.calls.find(call =>
        call[0].includes('UPDATE users SET password')
      );
      expect(updateCall).toBeDefined();
    });
  });
});
