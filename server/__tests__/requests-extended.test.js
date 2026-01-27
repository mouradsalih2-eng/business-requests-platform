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

describe('Requests Extended API', () => {
  const userToken = generateToken({ id: 1, email: 'user@example.com', role: 'user' });
  const adminToken = generateToken({ id: 2, email: 'admin@example.com', role: 'admin' });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/requests/stats/analytics', () => {
    it('returns 401 without authentication', async () => {
      const response = await request(app).get('/api/requests/stats/analytics');
      expect(response.status).toBe(401);
    });

    it('returns 403 for non-admin users', async () => {
      const response = await request(app)
        .get('/api/requests/stats/analytics')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
    });

    it('returns analytics data for 7 days period', async () => {
      const now = new Date();
      const mockRequests = [
        { id: 1, created_at: now.toISOString(), status: 'pending', category: 'bug', priority: 'high', team: 'Manufacturing', region: 'EMEA' },
        { id: 2, created_at: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(), status: 'completed', category: 'new_feature', priority: 'medium', team: 'Sales', region: 'North America' },
        { id: 3, created_at: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(), status: 'in_progress', category: 'optimization', priority: 'low', team: 'Service', region: 'APAC' },
      ];

      mockDb.all.mockReturnValue(mockRequests);

      const response = await request(app)
        .get('/api/requests/stats/analytics?period=7days')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.trendData).toBeDefined();
      expect(response.body.summary).toBeDefined();
      expect(response.body.summary.total).toBe(3);
      expect(response.body.summary.pending).toBe(1);
      expect(response.body.summary.completed).toBe(1);
      expect(response.body.categoryBreakdown).toBeDefined();
      expect(response.body.priorityBreakdown).toBeDefined();
      expect(response.body.teamBreakdown).toBeDefined();
      expect(response.body.regionBreakdown).toBeDefined();
    });

    it('returns analytics data for 30 days period', async () => {
      mockDb.all.mockReturnValue([]);

      const response = await request(app)
        .get('/api/requests/stats/analytics?period=30days')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.summary.total).toBe(0);
    });

    it('returns analytics data for 90 days period', async () => {
      mockDb.all.mockReturnValue([]);

      const response = await request(app)
        .get('/api/requests/stats/analytics?period=90days')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });

    it('returns analytics data for all time', async () => {
      mockDb.all.mockReturnValue([]);

      const response = await request(app)
        .get('/api/requests/stats/analytics?period=all')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });

    it('calculates category breakdown correctly', async () => {
      const mockRequests = [
        { id: 1, status: 'pending', category: 'bug', priority: 'high', team: 'Manufacturing', region: 'EMEA', created_at: new Date().toISOString() },
        { id: 2, status: 'pending', category: 'bug', priority: 'medium', team: 'Sales', region: 'EMEA', created_at: new Date().toISOString() },
        { id: 3, status: 'pending', category: 'new_feature', priority: 'low', team: 'Service', region: 'APAC', created_at: new Date().toISOString() },
      ];

      mockDb.all.mockReturnValue(mockRequests);

      const response = await request(app)
        .get('/api/requests/stats/analytics?period=7days')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.body.categoryBreakdown.bug).toBe(2);
      expect(response.body.categoryBreakdown.new_feature).toBe(1);
      expect(response.body.categoryBreakdown.optimization).toBe(0);
    });

    it('calculates priority breakdown correctly', async () => {
      const mockRequests = [
        { id: 1, status: 'pending', category: 'bug', priority: 'high', team: 'Manufacturing', region: 'EMEA', created_at: new Date().toISOString() },
        { id: 2, status: 'pending', category: 'bug', priority: 'high', team: 'Sales', region: 'EMEA', created_at: new Date().toISOString() },
        { id: 3, status: 'pending', category: 'bug', priority: 'low', team: 'Service', region: 'APAC', created_at: new Date().toISOString() },
      ];

      mockDb.all.mockReturnValue(mockRequests);

      const response = await request(app)
        .get('/api/requests/stats/analytics?period=7days')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.body.priorityBreakdown.high).toBe(2);
      expect(response.body.priorityBreakdown.low).toBe(1);
      expect(response.body.priorityBreakdown.medium).toBe(0);
    });
  });

  describe('GET /api/requests/:id/activity', () => {
    it('returns 401 without authentication', async () => {
      const response = await request(app).get('/api/requests/1/activity');
      expect(response.status).toBe(401);
    });

    it('returns empty array when no activity', async () => {
      mockDb.all.mockReturnValue([]);

      const response = await request(app)
        .get('/api/requests/1/activity')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('returns activity log with user names', async () => {
      const mockActivities = [
        {
          id: 1,
          request_id: 1,
          user_id: 2,
          action: 'status_change',
          old_value: 'pending',
          new_value: 'in_progress',
          created_at: '2024-01-15T10:00:00Z',
          user_name: 'Admin User',
        },
        {
          id: 2,
          request_id: 1,
          user_id: 2,
          action: 'status_change',
          old_value: 'in_progress',
          new_value: 'completed',
          created_at: '2024-01-20T14:00:00Z',
          user_name: 'Admin User',
        },
      ];

      mockDb.all.mockReturnValue(mockActivities);

      const response = await request(app)
        .get('/api/requests/1/activity')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(2);
      expect(response.body[0].action).toBe('status_change');
      expect(response.body[0].user_name).toBe('Admin User');
    });
  });

  describe('POST /api/requests/:id/merge', () => {
    it('returns 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/requests/1/merge')
        .send({ target_id: 2 });

      expect(response.status).toBe(401);
    });

    it('returns 403 for non-admin users', async () => {
      const response = await request(app)
        .post('/api/requests/1/merge')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ target_id: 2 });

      expect(response.status).toBe(403);
    });

    it('returns 400 if target_id is missing', async () => {
      const response = await request(app)
        .post('/api/requests/1/merge')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Target request ID');
    });

    it('returns 400 if trying to merge into itself', async () => {
      const response = await request(app)
        .post('/api/requests/1/merge')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ target_id: 1 });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('itself');
    });

    it('returns 404 if source request not found', async () => {
      mockDb.get.mockReturnValue(null);

      const response = await request(app)
        .post('/api/requests/999/merge')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ target_id: 2 });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('Source request not found');
    });

    it('returns 404 if target request not found', async () => {
      mockDb.get
        .mockReturnValueOnce({ id: 1, title: 'Source Request', status: 'pending' }) // source exists
        .mockReturnValueOnce(null); // target not found

      const response = await request(app)
        .post('/api/requests/1/merge')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ target_id: 999 });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('Target request not found');
    });

    it('returns 400 if source is already merged', async () => {
      mockDb.get
        .mockReturnValueOnce({ id: 1, title: 'Source', status: 'duplicate', merged_into_id: 5 })
        .mockReturnValueOnce({ id: 2, title: 'Target', status: 'pending' });

      const response = await request(app)
        .post('/api/requests/1/merge')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ target_id: 2 });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('already merged');
    });

    it('merges requests successfully with vote transfer', async () => {
      mockDb.get
        .mockReturnValueOnce({ id: 1, title: 'Source', status: 'pending', merged_into_id: null })
        .mockReturnValueOnce({ id: 2, title: 'Target', status: 'pending' })
        .mockReturnValueOnce(null) // no existing vote on target
        .mockReturnValueOnce({ id: 1, title: 'Source', status: 'duplicate', merged_into_id: 2 }); // updated source

      mockDb.all.mockReturnValue([{ user_id: 5, type: 'upvote' }]); // votes from source
      mockDb.run.mockReturnValue({ changes: 1 });

      const response = await request(app)
        .post('/api/requests/1/merge')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ target_id: 2, merge_votes: true });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('merged');
      expect(response.body.target_id).toBe(2);
      expect(response.body.votes_transferred).toBe(true);
    });

    it('merges without vote transfer when merge_votes is false', async () => {
      mockDb.get
        .mockReturnValueOnce({ id: 1, title: 'Source', status: 'pending', merged_into_id: null })
        .mockReturnValueOnce({ id: 2, title: 'Target', status: 'pending' })
        .mockReturnValueOnce({ id: 1, title: 'Source', status: 'duplicate', merged_into_id: 2 });

      mockDb.run.mockReturnValue({ changes: 1 });

      const response = await request(app)
        .post('/api/requests/1/merge')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ target_id: 2, merge_votes: false });

      expect(response.status).toBe(200);
      expect(response.body.votes_transferred).toBe(false);
    });

    it('transfers comments when merge_comments is true', async () => {
      mockDb.get
        .mockReturnValueOnce({ id: 1, title: 'Source', status: 'pending', merged_into_id: null })
        .mockReturnValueOnce({ id: 2, title: 'Target', status: 'pending' })
        .mockReturnValueOnce({ id: 1, title: 'Source', status: 'duplicate', merged_into_id: 2 });

      mockDb.all.mockReturnValue([]);
      mockDb.run.mockReturnValue({ changes: 1 });

      const response = await request(app)
        .post('/api/requests/1/merge')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ target_id: 2, merge_comments: true });

      expect(response.status).toBe(200);
      expect(response.body.comments_transferred).toBe(true);

      // Verify comment transfer SQL was called
      const commentTransferCall = mockDb.run.mock.calls.find(call =>
        call[0].includes('UPDATE comments SET request_id')
      );
      expect(commentTransferCall).toBeDefined();
    });

    it('logs merge activity on both source and target', async () => {
      mockDb.get
        .mockReturnValueOnce({ id: 1, title: 'Source', status: 'pending', merged_into_id: null })
        .mockReturnValueOnce({ id: 2, title: 'Target', status: 'pending' })
        .mockReturnValueOnce({ id: 1, title: 'Source', status: 'duplicate', merged_into_id: 2 });

      mockDb.all.mockReturnValue([]);
      mockDb.run.mockReturnValue({ changes: 1 });

      await request(app)
        .post('/api/requests/1/merge')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ target_id: 2 });

      // Should log activity for both source and target
      const activityLogCalls = mockDb.run.mock.calls.filter(call =>
        call[0].includes('INSERT INTO activity_log')
      );
      expect(activityLogCalls.length).toBe(2);
    });
  });

  describe('Request filtering edge cases', () => {
    it('filters by time period - today', async () => {
      mockDb.all.mockReturnValue([]);
      mockDb.get.mockReturnValue(null);

      await request(app)
        .get('/api/requests?timePeriod=today')
        .set('Authorization', `Bearer ${userToken}`);

      const sqlCall = mockDb.all.mock.calls[0];
      expect(sqlCall[0]).toContain('r.created_at >=');
    });

    it('filters by time period - 7 days', async () => {
      mockDb.all.mockReturnValue([]);
      mockDb.get.mockReturnValue(null);

      await request(app)
        .get('/api/requests?timePeriod=7days')
        .set('Authorization', `Bearer ${userToken}`);

      const sqlCall = mockDb.all.mock.calls[0];
      expect(sqlCall[0]).toContain('r.created_at >=');
    });

    it('filters by search term', async () => {
      mockDb.all.mockReturnValue([]);
      mockDb.get.mockReturnValue(null);

      await request(app)
        .get('/api/requests?search=test')
        .set('Authorization', `Bearer ${userToken}`);

      const sqlCall = mockDb.all.mock.calls[0];
      expect(sqlCall[0]).toContain('r.title LIKE');
    });

    it('sorts by popularity', async () => {
      mockDb.all.mockReturnValue([]);
      mockDb.get.mockReturnValue(null);

      await request(app)
        .get('/api/requests?sort=popularity')
        .set('Authorization', `Bearer ${userToken}`);

      const sqlCall = mockDb.all.mock.calls[0];
      expect(sqlCall[0]).toContain('(upvotes + likes)');
    });

    it('sorts by upvotes', async () => {
      mockDb.all.mockReturnValue([]);
      mockDb.get.mockReturnValue(null);

      await request(app)
        .get('/api/requests?sort=upvotes')
        .set('Authorization', `Bearer ${userToken}`);

      const sqlCall = mockDb.all.mock.calls[0];
      expect(sqlCall[0]).toContain('ORDER BY upvotes');
    });

    it('excludes archived requests by default', async () => {
      mockDb.all.mockReturnValue([]);
      mockDb.get.mockReturnValue(null);

      await request(app)
        .get('/api/requests')
        .set('Authorization', `Bearer ${userToken}`);

      const sqlCall = mockDb.all.mock.calls[0];
      expect(sqlCall[0]).toContain("r.status != ?");
      expect(sqlCall[1]).toContain('archived');
    });

    it('includes archived when specifically filtered', async () => {
      mockDb.all.mockReturnValue([]);
      mockDb.get.mockReturnValue(null);

      await request(app)
        .get('/api/requests?status=archived')
        .set('Authorization', `Bearer ${userToken}`);

      const sqlCall = mockDb.all.mock.calls[0];
      expect(sqlCall[0]).toContain('r.status = ?');
      expect(sqlCall[1]).toContain('archived');
    });
  });

  describe('Admin read tracking', () => {
    it('tracks isRead status for admin users', async () => {
      const mockRequests = [{ id: 1, title: 'Test', status: 'pending', author_name: 'User' }];
      mockDb.all
        .mockReturnValueOnce(mockRequests) // requests query
        .mockReturnValueOnce([]); // user votes query

      mockDb.get.mockReturnValue({ id: 1 }); // read record exists

      const response = await request(app)
        .get('/api/requests')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body[0].isRead).toBe(true);
    });

    it('marks isRead as false when admin has not read', async () => {
      const mockRequests = [{ id: 1, title: 'Test', status: 'pending', author_name: 'User' }];
      mockDb.all
        .mockReturnValueOnce(mockRequests)
        .mockReturnValueOnce([]);

      mockDb.get.mockReturnValue(null); // no read record

      const response = await request(app)
        .get('/api/requests')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body[0].isRead).toBe(false);
    });
  });
});
