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
const { default: requestsRoutes } = await import('../src/routes/requests.js');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/requests', requestsRoutes);

// Helper to generate tokens
const generateToken = (user) => jwt.sign(user, JWT_SECRET);

describe('Requests API', () => {
  const userToken = generateToken({ id: 1, email: 'user@example.com', role: 'user' });
  const adminToken = generateToken({ id: 2, email: 'admin@example.com', role: 'admin' });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/requests', () => {
    it('returns 401 without authentication', async () => {
      const response = await request(app).get('/api/requests');
      expect(response.status).toBe(401);
    });

    it('returns list of requests', async () => {
      const mockRequests = [
        {
          id: 1,
          title: 'Request 1',
          status: 'pending',
          category: 'bug',
          priority: 'high',
          author_name: 'Test User',
          author_email: 'test@example.com',
          upvotes: 5,
          likes: 3,
          comment_count: 2,
        },
      ];

      mockDb.all.mockImplementation((query, params) => {
        if (query.includes('SELECT')) {
          if (query.includes('votes')) {
            return [];
          }
          return mockRequests;
        }
        return [];
      });

      mockDb.get.mockReturnValue(null);

      const response = await request(app)
        .get('/api/requests')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('filters by status', async () => {
      mockDb.all.mockReturnValue([]);
      mockDb.get.mockReturnValue(null);

      await request(app)
        .get('/api/requests?status=pending')
        .set('Authorization', `Bearer ${userToken}`);

      // Check that the query includes status filter
      const sqlCall = mockDb.all.mock.calls[0];
      expect(sqlCall[0]).toContain('r.status = ?');
      expect(sqlCall[1]).toContain('pending');
    });

    it('filters by category', async () => {
      mockDb.all.mockReturnValue([]);
      mockDb.get.mockReturnValue(null);

      await request(app)
        .get('/api/requests?category=bug')
        .set('Authorization', `Bearer ${userToken}`);

      const sqlCall = mockDb.all.mock.calls[0];
      expect(sqlCall[0]).toContain('r.category = ?');
      expect(sqlCall[1]).toContain('bug');
    });

    it('filters user own requests with myRequests param', async () => {
      mockDb.all.mockReturnValue([]);
      mockDb.get.mockReturnValue(null);

      await request(app)
        .get('/api/requests?myRequests=true')
        .set('Authorization', `Bearer ${userToken}`);

      const sqlCall = mockDb.all.mock.calls[0];
      expect(sqlCall[0]).toContain('r.user_id = ?');
      expect(sqlCall[1]).toContain(1); // user id from token
    });
  });

  describe('GET /api/requests/:id', () => {
    it('returns 404 if request not found', async () => {
      mockDb.get.mockReturnValue(null);

      const response = await request(app)
        .get('/api/requests/999')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Request not found');
    });

    it('returns request with details', async () => {
      const mockRequest = {
        id: 1,
        title: 'Test Request',
        status: 'pending',
        category: 'bug',
        priority: 'high',
        user_id: 1,
        author_name: 'Test User',
        upvotes: 5,
        likes: 3,
      };

      mockDb.get.mockReturnValue(mockRequest);
      mockDb.all.mockReturnValue([]);

      const response = await request(app)
        .get('/api/requests/1')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(1);
      expect(response.body.title).toBe('Test Request');
      expect(response.body.attachments).toBeDefined();
      expect(response.body.userVotes).toBeDefined();
    });
  });

  describe('POST /api/requests', () => {
    it('returns 400 if title is missing', async () => {
      const response = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ category: 'bug', priority: 'high' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    it('returns 400 if category is missing', async () => {
      const response = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Test', priority: 'high' });

      expect(response.status).toBe(400);
    });

    it('creates request successfully', async () => {
      mockDb.run.mockReturnValue({ lastInsertRowid: 1 });
      mockDb.get.mockReturnValue({
        id: 1,
        title: 'New Request',
        category: 'bug',
        priority: 'high',
        status: 'pending',
        user_id: 1,
      });
      mockDb.all.mockReturnValue([]);

      const response = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'New Request',
          category: 'bug',
          priority: 'high',
        });

      expect(response.status).toBe(201);
      expect(response.body.title).toBe('New Request');
    });
  });

  describe('PATCH /api/requests/:id', () => {
    it('returns 404 if request not found', async () => {
      mockDb.get.mockReturnValue(null);

      const response = await request(app)
        .patch('/api/requests/999')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Updated' });

      expect(response.status).toBe(404);
    });

    it('returns 403 if user is not owner or admin', async () => {
      mockDb.get.mockReturnValue({
        id: 1,
        user_id: 999, // Different user
        status: 'pending',
      });

      const response = await request(app)
        .patch('/api/requests/1')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Updated' });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Not authorized');
    });

    it('allows owner to update content', async () => {
      const mockRequest = {
        id: 1,
        user_id: 1,
        title: 'Original',
        status: 'pending',
      };

      mockDb.get
        .mockReturnValueOnce(mockRequest)
        .mockReturnValueOnce({ ...mockRequest, title: 'Updated Title' });

      mockDb.run.mockReturnValue({ changes: 1 });

      const response = await request(app)
        .patch('/api/requests/1')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Updated Title' });

      expect(response.status).toBe(200);
    });

    it('allows admin to update status', async () => {
      const mockRequest = {
        id: 1,
        user_id: 999,
        title: 'Request',
        status: 'pending',
      };

      mockDb.get
        .mockReturnValueOnce(mockRequest)
        .mockReturnValueOnce({ ...mockRequest, status: 'in_progress' });

      mockDb.run.mockReturnValue({ changes: 1 });

      const response = await request(app)
        .patch('/api/requests/1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'in_progress' });

      expect(response.status).toBe(200);
      // Verify status update was called
      expect(mockDb.run).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/requests/:id', () => {
    it('returns 401 without authentication', async () => {
      const response = await request(app).delete('/api/requests/1');
      expect(response.status).toBe(401);
    });

    it('returns 403 for non-admin users', async () => {
      const response = await request(app)
        .delete('/api/requests/1')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Admin access required');
    });

    it('returns 404 if request not found', async () => {
      mockDb.get.mockReturnValue(null);

      const response = await request(app)
        .delete('/api/requests/999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });

    it('deletes request successfully for admin', async () => {
      mockDb.get.mockReturnValue({ id: 1, title: 'To Delete' });
      mockDb.run.mockReturnValue({ changes: 1 });

      const response = await request(app)
        .delete('/api/requests/1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('deleted');
    });
  });

  describe('GET /api/requests/search', () => {
    it('returns empty array for short query', async () => {
      const response = await request(app)
        .get('/api/requests/search?q=a')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('returns search results', async () => {
      mockDb.all.mockReturnValue([
        { id: 1, title: 'Bug in login', status: 'pending', category: 'bug', author_name: 'User' },
        { id: 2, title: 'Login feature request', status: 'pending', category: 'new_feature', author_name: 'Admin' },
      ]);

      const response = await request(app)
        .get('/api/requests/search?q=login')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /api/requests/:id/interactions', () => {
    it('returns interactions for a request', async () => {
      mockDb.all
        .mockReturnValueOnce([{ id: 1, name: 'User 1' }]) // upvoters
        .mockReturnValueOnce([{ id: 2, name: 'User 2' }]) // likers
        .mockReturnValueOnce([{ id: 3, name: 'User 3' }]); // commenters

      const response = await request(app)
        .get('/api/requests/1/interactions')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.upvoters).toBeDefined();
      expect(response.body.likers).toBeDefined();
      expect(response.body.commenters).toBeDefined();
    });
  });

  describe('POST /api/requests/:id/read', () => {
    it('returns 403 for non-admin users', async () => {
      const response = await request(app)
        .post('/api/requests/1/read')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
    });

    it('marks request as read for admin', async () => {
      mockDb.get
        .mockReturnValueOnce({ id: 1, title: 'Request' }) // request exists
        .mockReturnValueOnce(null); // not already read

      mockDb.run.mockReturnValue({ changes: 1 });

      const response = await request(app)
        .post('/api/requests/1/read')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('read');
    });
  });
});
