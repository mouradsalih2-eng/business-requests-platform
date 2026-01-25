import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
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

// Mock the database module
jest.unstable_mockModule('../src/db/database.js', () => ({
  default: mockDb,
  initializeDatabase: jest.fn(),
}));

// Mock JWT_SECRET
const JWT_SECRET = 'test-secret';
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

// Import router after mocks
const { default: authRoutes } = await import('../src/routes/auth.js');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Auth API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('returns 403 - registration disabled', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Registration is disabled');
    });
  });

  describe('POST /api/auth/login', () => {
    it('returns 400 if email is missing', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ password: 'password123' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Email and password are required');
    });

    it('returns 400 if password is missing', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Email and password are required');
    });

    it('returns 401 if user not found', async () => {
      mockDb.get.mockReturnValue(null);

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'notfound@example.com', password: 'password123' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('returns 401 if password is incorrect', async () => {
      const hashedPassword = bcrypt.hashSync('correctpassword', 10);
      mockDb.get.mockReturnValue({
        id: 1,
        email: 'test@example.com',
        password: hashedPassword,
        name: 'Test User',
        role: 'user',
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'wrongpassword' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('returns user and token on successful login', async () => {
      const hashedPassword = bcrypt.hashSync('password123', 10);
      mockDb.get.mockReturnValue({
        id: 1,
        email: 'test@example.com',
        password: hashedPassword,
        name: 'Test User',
        role: 'user',
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(response.status).toBe(200);
      expect(response.body.user).toEqual({
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
      });
      expect(response.body.token).toBeDefined();
      expect(response.body.user.password).toBeUndefined();

      // Verify token is valid
      const decoded = jwt.verify(response.body.token, JWT_SECRET);
      expect(decoded.id).toBe(1);
      expect(decoded.email).toBe('test@example.com');
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns 401 without token', async () => {
      const response = await request(app).get('/api/auth/me');

      expect(response.status).toBe(401);
    });

    it('returns 403 with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(403);
    });

    it('returns 404 if user not found', async () => {
      const token = jwt.sign({ id: 999, email: 'ghost@example.com', role: 'user' }, JWT_SECRET);
      mockDb.get.mockReturnValue(null);

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('User not found');
    });

    it('returns user data with valid token', async () => {
      const token = jwt.sign({ id: 1, email: 'test@example.com', role: 'user' }, JWT_SECRET);
      mockDb.get.mockReturnValue({
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        created_at: '2024-01-01T00:00:00.000Z',
      });

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        created_at: '2024-01-01T00:00:00.000Z',
      });
    });
  });
});
