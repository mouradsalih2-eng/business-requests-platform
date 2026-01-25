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
}));

// Import router after mocks
const { default: votesRoutes } = await import('../src/routes/votes.js');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/votes', votesRoutes);

// Helper to generate tokens
const generateToken = (user) => jwt.sign(user, JWT_SECRET);

describe('Votes API', () => {
  const userToken = generateToken({ id: 1, email: 'user@example.com', role: 'user' });
  const user2Token = generateToken({ id: 2, email: 'user2@example.com', role: 'user' });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/votes/:requestId/vote', () => {
    it('returns 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/votes/1/vote')
        .send({ type: 'upvote' });
      expect(response.status).toBe(401);
    });

    it('returns 400 if vote type is missing', async () => {
      const response = await request(app)
        .post('/api/votes/1/vote')
        .set('Authorization', `Bearer ${userToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Vote type');
    });

    it('returns 400 if vote type is invalid', async () => {
      const response = await request(app)
        .post('/api/votes/1/vote')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ type: 'invalid' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('upvote');
    });

    it('returns 404 if request not found', async () => {
      mockDb.get.mockReturnValue(null);

      const response = await request(app)
        .post('/api/votes/999/vote')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ type: 'upvote' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Request not found');
    });

    it('returns 400 if already voted same type', async () => {
      mockDb.get
        .mockReturnValueOnce({ id: 1 }) // request exists
        .mockReturnValueOnce({ id: 1 }); // existing vote

      const response = await request(app)
        .post('/api/votes/1/vote')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ type: 'upvote' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('already');
    });

    it('adds upvote successfully', async () => {
      mockDb.get
        .mockReturnValueOnce({ id: 1 }) // request exists
        .mockReturnValueOnce(null) // no existing vote
        .mockReturnValueOnce({ count: 1 }) // upvotes count
        .mockReturnValueOnce({ count: 0 }); // likes count

      mockDb.all.mockReturnValue([{ type: 'upvote' }]);
      mockDb.run.mockReturnValue({ changes: 1 });

      const response = await request(app)
        .post('/api/votes/1/vote')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ type: 'upvote' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Vote added');
      expect(response.body.upvotes).toBe(1);
      expect(response.body.userVotes).toContain('upvote');
    });

    it('adds like successfully', async () => {
      mockDb.get
        .mockReturnValueOnce({ id: 1 }) // request exists
        .mockReturnValueOnce(null) // no existing vote
        .mockReturnValueOnce({ count: 0 }) // upvotes count
        .mockReturnValueOnce({ count: 1 }); // likes count

      mockDb.all.mockReturnValue([{ type: 'like' }]);
      mockDb.run.mockReturnValue({ changes: 1 });

      const response = await request(app)
        .post('/api/votes/1/vote')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ type: 'like' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Vote added');
      expect(response.body.likes).toBe(1);
      expect(response.body.userVotes).toContain('like');
    });

    it('allows both upvote and like on same request', async () => {
      // First add upvote
      mockDb.get
        .mockReturnValueOnce({ id: 1 })
        .mockReturnValueOnce(null)
        .mockReturnValueOnce({ count: 1 })
        .mockReturnValueOnce({ count: 0 });
      mockDb.all.mockReturnValue([{ type: 'upvote' }]);
      mockDb.run.mockReturnValue({ changes: 1 });

      await request(app)
        .post('/api/votes/1/vote')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ type: 'upvote' });

      // Then add like (different type, should work)
      mockDb.get
        .mockReturnValueOnce({ id: 1 })
        .mockReturnValueOnce(null) // no existing like
        .mockReturnValueOnce({ count: 1 })
        .mockReturnValueOnce({ count: 1 });
      mockDb.all.mockReturnValue([{ type: 'upvote' }, { type: 'like' }]);

      const response = await request(app)
        .post('/api/votes/1/vote')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ type: 'like' });

      expect(response.status).toBe(200);
      expect(response.body.userVotes).toContain('upvote');
      expect(response.body.userVotes).toContain('like');
    });
  });

  describe('DELETE /api/votes/:requestId/vote/:type', () => {
    it('returns 401 without authentication', async () => {
      const response = await request(app).delete('/api/votes/1/vote/upvote');
      expect(response.status).toBe(401);
    });

    it('returns 400 for invalid vote type', async () => {
      const response = await request(app)
        .delete('/api/votes/1/vote/invalid')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('upvote');
    });

    it('returns 404 if vote not found', async () => {
      mockDb.get.mockReturnValue(null);

      const response = await request(app)
        .delete('/api/votes/1/vote/upvote')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Vote not found');
    });

    it('removes upvote successfully', async () => {
      mockDb.get
        .mockReturnValueOnce({ id: 1 }) // existing vote
        .mockReturnValueOnce({ count: 0 }) // upvotes after removal
        .mockReturnValueOnce({ count: 1 }); // likes count

      mockDb.all.mockReturnValue([{ type: 'like' }]); // remaining votes
      mockDb.run.mockReturnValue({ changes: 1 });

      const response = await request(app)
        .delete('/api/votes/1/vote/upvote')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Vote removed');
      expect(response.body.upvotes).toBe(0);
      expect(response.body.userVotes).not.toContain('upvote');
    });

    it('removes like successfully', async () => {
      mockDb.get
        .mockReturnValueOnce({ id: 1 }) // existing vote
        .mockReturnValueOnce({ count: 2 }) // upvotes count
        .mockReturnValueOnce({ count: 0 }); // likes after removal

      mockDb.all.mockReturnValue([{ type: 'upvote' }]);
      mockDb.run.mockReturnValue({ changes: 1 });

      const response = await request(app)
        .delete('/api/votes/1/vote/like')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Vote removed');
      expect(response.body.likes).toBe(0);
    });
  });

  describe('GET /api/votes/:requestId/votes', () => {
    it('returns 401 without authentication', async () => {
      const response = await request(app).get('/api/votes/1/votes');
      expect(response.status).toBe(401);
    });

    it('returns vote counts and user votes', async () => {
      mockDb.get
        .mockReturnValueOnce({ count: 5 }) // upvotes
        .mockReturnValueOnce({ count: 3 }); // likes

      mockDb.all.mockReturnValue([{ type: 'upvote' }]);

      const response = await request(app)
        .get('/api/votes/1/votes')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.upvotes).toBe(5);
      expect(response.body.likes).toBe(3);
      expect(response.body.userVotes).toEqual(['upvote']);
    });

    it('returns empty userVotes if user has not voted', async () => {
      mockDb.get
        .mockReturnValueOnce({ count: 10 })
        .mockReturnValueOnce({ count: 5 });

      mockDb.all.mockReturnValue([]);

      const response = await request(app)
        .get('/api/votes/1/votes')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.userVotes).toEqual([]);
    });

    it('returns both vote types if user voted both', async () => {
      mockDb.get
        .mockReturnValueOnce({ count: 10 })
        .mockReturnValueOnce({ count: 5 });

      mockDb.all.mockReturnValue([{ type: 'upvote' }, { type: 'like' }]);

      const response = await request(app)
        .get('/api/votes/1/votes')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.userVotes).toContain('upvote');
      expect(response.body.userVotes).toContain('like');
    });
  });
});
