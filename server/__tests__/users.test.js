import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// Mock bcrypt
jest.unstable_mockModule('bcryptjs', () => ({
  default: {
    hash: jest.fn().mockResolvedValue('hashed_password'),
    compare: jest.fn(),
  },
}));

// Mock the database
const mockDb = {
  get: jest.fn(),
  all: jest.fn(),
  run: jest.fn(),
};

// Mock JWT_SECRET
const JWT_SECRET = 'test-secret';

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

// Import router after mocks
const { default: usersRoutes } = await import('../src/routes/users.js');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/users', usersRoutes);

// Helper to generate tokens
const generateToken = (user) => jwt.sign(user, JWT_SECRET);

describe('Users API', () => {
  const userToken = generateToken({ id: 1, email: 'user@example.com', role: 'user' });
  const adminToken = generateToken({ id: 2, email: 'admin@example.com', role: 'admin' });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/users/search', () => {
    it('returns 401 without authentication', async () => {
      const response = await request(app).get('/api/users/search?q=john');
      expect(response.status).toBe(401);
    });

    it('returns empty array for empty query', async () => {
      const response = await request(app)
        .get('/api/users/search?q=')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('returns matching users by name', async () => {
      mockDb.all.mockReturnValue([
        { id: 1, name: 'John Doe', email: 'john@example.com' },
        { id: 2, name: 'Johnny Smith', email: 'johnny@example.com' },
      ]);

      const response = await request(app)
        .get('/api/users/search?q=john')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(2);
      expect(response.body[0].name).toContain('John');
    });

    it('returns matching users by email', async () => {
      mockDb.all.mockReturnValue([
        { id: 1, name: 'Test User', email: 'test@company.com' },
      ]);

      const response = await request(app)
        .get('/api/users/search?q=company')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(1);
    });

    it('limits results to 10', async () => {
      // Check that LIMIT 10 is in the query
      mockDb.all.mockReturnValue([]);

      await request(app)
        .get('/api/users/search?q=test')
        .set('Authorization', `Bearer ${userToken}`);

      const sqlCall = mockDb.all.mock.calls[0];
      expect(sqlCall[0]).toContain('LIMIT 10');
    });
  });

  describe('GET /api/users', () => {
    it('returns 401 without authentication', async () => {
      const response = await request(app).get('/api/users');
      expect(response.status).toBe(401);
    });

    it('returns 403 for non-admin users', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Admin');
    });

    it('returns all users for admin', async () => {
      mockDb.all.mockReturnValue([
        { id: 1, email: 'user1@test.com', name: 'User 1', role: 'employee', request_count: 5 },
        { id: 2, email: 'user2@test.com', name: 'User 2', role: 'admin', request_count: 3 },
      ]);

      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(2);
      expect(response.body[0].request_count).toBeDefined();
    });
  });

  describe('POST /api/users', () => {
    it('returns 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({ email: 'new@test.com', password: 'pass123', name: 'New User' });
      expect(response.status).toBe(401);
    });

    it('returns 403 for non-admin users', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ email: 'new@test.com', password: 'pass123', name: 'New User' });

      expect(response.status).toBe(403);
    });

    it('returns 400 if email is missing', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ password: 'pass123', name: 'New User' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    it('returns 400 if password is missing', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'new@test.com', name: 'New User' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    it('returns 400 if name is missing', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'new@test.com', password: 'pass123' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    it('returns 400 for invalid email format', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'invalid-email', password: 'pass123', name: 'New User' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('valid email');
    });

    it('returns 400 for invalid role', async () => {
      mockDb.get.mockReturnValue(null); // no existing user

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'new@test.com', password: 'pass123', name: 'New User', role: 'superuser' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Role');
    });

    it('returns 400 if user already exists', async () => {
      mockDb.get.mockReturnValue({ id: 1, email: 'existing@test.com' });

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'existing@test.com', password: 'pass123', name: 'Existing User' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('already exists');
    });

    it('creates user with default role', async () => {
      mockDb.get
        .mockReturnValueOnce(null) // no existing user
        .mockReturnValueOnce({
          id: 10,
          email: 'new@test.com',
          name: 'New User',
          role: 'employee',
          created_at: '2024-01-01',
        });

      mockDb.run.mockReturnValue({ lastInsertRowid: 10 });

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'new@test.com', password: 'pass123', name: 'New User' });

      expect(response.status).toBe(201);
      expect(response.body.email).toBe('new@test.com');
      expect(response.body.role).toBe('employee');
    });

    it('creates user with admin role', async () => {
      mockDb.get
        .mockReturnValueOnce(null)
        .mockReturnValueOnce({
          id: 10,
          email: 'newadmin@test.com',
          name: 'New Admin',
          role: 'admin',
          created_at: '2024-01-01',
        });

      mockDb.run.mockReturnValue({ lastInsertRowid: 10 });

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'newadmin@test.com', password: 'pass123', name: 'New Admin', role: 'admin' });

      expect(response.status).toBe(201);
      expect(response.body.role).toBe('admin');
    });
  });

  describe('PATCH /api/users/:id', () => {
    it('returns 401 without authentication', async () => {
      const response = await request(app)
        .patch('/api/users/5')
        .send({ role: 'admin' });
      expect(response.status).toBe(401);
    });

    it('returns 403 for non-admin users', async () => {
      const response = await request(app)
        .patch('/api/users/5')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ role: 'admin' });

      expect(response.status).toBe(403);
    });

    it('returns 400 for invalid role', async () => {
      const response = await request(app)
        .patch('/api/users/5')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'superadmin' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Role');
    });

    it('returns 400 when trying to change own role', async () => {
      const response = await request(app)
        .patch('/api/users/2') // admin's own ID
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'employee' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('own role');
    });

    it('returns 404 if user not found', async () => {
      mockDb.get.mockReturnValue(null);

      const response = await request(app)
        .patch('/api/users/999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'admin' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('User not found');
    });

    it('updates user role successfully', async () => {
      mockDb.get
        .mockReturnValueOnce({ id: 5 }) // user exists
        .mockReturnValueOnce({
          id: 5,
          email: 'user@test.com',
          name: 'Test User',
          role: 'admin',
          created_at: '2024-01-01',
        });

      mockDb.run.mockReturnValue({ changes: 1 });

      const response = await request(app)
        .patch('/api/users/5')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'admin' });

      expect(response.status).toBe(200);
      expect(response.body.role).toBe('admin');
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('returns 401 without authentication', async () => {
      const response = await request(app).delete('/api/users/5');
      expect(response.status).toBe(401);
    });

    it('returns 403 for non-admin users', async () => {
      const response = await request(app)
        .delete('/api/users/5')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
    });

    it('returns 400 when trying to delete own account', async () => {
      const response = await request(app)
        .delete('/api/users/2') // admin's own ID
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('own account');
    });

    it('returns 404 if user not found', async () => {
      mockDb.get.mockReturnValue(null);

      const response = await request(app)
        .delete('/api/users/999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('User not found');
    });

    it('deletes user successfully', async () => {
      mockDb.get.mockReturnValue({ id: 5, email: 'todelete@test.com' });
      mockDb.run.mockReturnValue({ changes: 1 });

      const response = await request(app)
        .delete('/api/users/5')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('deleted');
    });
  });

  describe('POST /api/users/seed', () => {
    it('returns 401 without authentication', async () => {
      const response = await request(app).post('/api/users/seed');
      expect(response.status).toBe(401);
    });

    it('returns 403 for non-admin users', async () => {
      const response = await request(app)
        .post('/api/users/seed')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
    });

    it('seeds database successfully for admin', async () => {
      // Mock all db operations for seeding
      mockDb.get
        .mockReturnValue(null) // no existing users/requests
        .mockReturnValue({ id: 1 }) // created items
        .mockReturnValue({ count: 10 }); // counts

      mockDb.run.mockReturnValue({ lastInsertRowid: 1 });

      const response = await request(app)
        .post('/api/users/seed')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('seeded');
      expect(response.body.users).toBeDefined();
      expect(response.body.requests).toBeDefined();
    });
  });
});
