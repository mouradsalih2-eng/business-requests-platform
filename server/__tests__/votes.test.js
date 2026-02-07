import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// ── Constants ────────────────────────────────────────────────────────

const JWT_SECRET = 'test-secret';

// ── Mock repositories ────────────────────────────────────────────────

const mockVoteRepository = {
  findByRequestAndUser: jest.fn(),
  getUserVoteTypes: jest.fn(),
  getCounts: jest.fn(),
  create: jest.fn(),
  delete: jest.fn(),
  findByRequest: jest.fn(),
  deleteByRequest: jest.fn(),
  getUpvoters: jest.fn(),
  getLikers: jest.fn(),
  count: jest.fn(),
};

const mockRequestRepository = {
  findById: jest.fn(),
  findByIdOrFail: jest.fn(),
};

jest.unstable_mockModule('../src/repositories/voteRepository.js', () => ({
  voteRepository: mockVoteRepository,
}));

jest.unstable_mockModule('../src/repositories/requestRepository.js', () => ({
  requestRepository: mockRequestRepository,
}));

// Mock supabase so transitive imports never try to connect
jest.unstable_mockModule('../src/db/supabase.js', () => ({
  supabase: {},
}));

// Mock auth middleware to use local JWT verification
jest.unstable_mockModule('../src/services/authService.js', () => ({
  authService: {},
  JWT_SECRET,
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

// ── Import route + error handler AFTER mocks ─────────────────────────

const { default: votesRoutes } = await import('../src/routes/votes.js');
const { errorHandler } = await import('../src/middleware/errorHandler.js');
const { NotFoundError, AppError } = await import('../src/errors/AppError.js');

// ── Build test Express app ───────────────────────────────────────────

const app = express();
app.use(express.json());
app.use('/api/votes', votesRoutes);
app.use(errorHandler);

// ── Helpers ──────────────────────────────────────────────────────────

const generateToken = (payload) => jwt.sign(payload, JWT_SECRET);

// ── Tests ────────────────────────────────────────────────────────────

describe('Votes API', () => {
  const userToken = generateToken({ id: 1, email: 'user@example.com', role: 'employee' });
  const user2Token = generateToken({ id: 2, email: 'user2@example.com', role: 'employee' });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── POST /:requestId/vote ─────────────────────────────────────────

  describe('POST /api/votes/:requestId/vote', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app)
        .post('/api/votes/1/vote')
        .send({ type: 'upvote' });

      expect(res.status).toBe(401);
    });

    it('adds an upvote successfully', async () => {
      mockRequestRepository.findByIdOrFail.mockResolvedValue({ id: 1 });
      mockVoteRepository.create.mockResolvedValue(undefined);
      mockVoteRepository.getCounts.mockResolvedValue({ upvotes: 1, likes: 0 });
      mockVoteRepository.getUserVoteTypes.mockResolvedValue(['upvote']);

      const res = await request(app)
        .post('/api/votes/1/vote')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ type: 'upvote' });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Vote added');
      expect(res.body.upvotes).toBe(1);
      expect(res.body.likes).toBe(0);
      expect(res.body.userVotes).toContain('upvote');

      expect(mockRequestRepository.findByIdOrFail).toHaveBeenCalledWith('1');
      expect(mockVoteRepository.create).toHaveBeenCalledWith('1', 1, 'upvote');
    });

    it('adds a like successfully', async () => {
      mockRequestRepository.findByIdOrFail.mockResolvedValue({ id: 1 });
      mockVoteRepository.create.mockResolvedValue(undefined);
      mockVoteRepository.getCounts.mockResolvedValue({ upvotes: 0, likes: 1 });
      mockVoteRepository.getUserVoteTypes.mockResolvedValue(['like']);

      const res = await request(app)
        .post('/api/votes/1/vote')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ type: 'like' });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Vote added');
      expect(res.body.likes).toBe(1);
      expect(res.body.userVotes).toContain('like');
    });

    it('returns 400 for invalid vote type', async () => {
      const res = await request(app)
        .post('/api/votes/1/vote')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ type: 'dislike' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/upvote|like/i);
    });

    it('returns 400 when vote type is missing', async () => {
      const res = await request(app)
        .post('/api/votes/1/vote')
        .set('Authorization', `Bearer ${userToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Vote type/i);
    });

    it('returns 404 when the request does not exist', async () => {
      mockRequestRepository.findByIdOrFail.mockRejectedValue(new NotFoundError('Request'));

      const res = await request(app)
        .post('/api/votes/999/vote')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ type: 'upvote' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Request not found');
    });

    it('returns 400 on duplicate vote', async () => {
      mockRequestRepository.findByIdOrFail.mockResolvedValue({ id: 1 });
      mockVoteRepository.create.mockRejectedValue(
        new AppError('You have already upvoted this request', 400)
      );

      const res = await request(app)
        .post('/api/votes/1/vote')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ type: 'upvote' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('already');
    });
  });

  // ── DELETE /:requestId/vote/:type ─────────────────────────────────

  describe('DELETE /api/votes/:requestId/vote/:type', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app).delete('/api/votes/1/vote/upvote');
      expect(res.status).toBe(401);
    });

    it('removes an upvote successfully', async () => {
      mockVoteRepository.findByRequestAndUser.mockResolvedValue({ id: 10 });
      mockVoteRepository.delete.mockResolvedValue(undefined);
      mockVoteRepository.getCounts.mockResolvedValue({ upvotes: 0, likes: 1 });
      mockVoteRepository.getUserVoteTypes.mockResolvedValue(['like']);

      const res = await request(app)
        .delete('/api/votes/1/vote/upvote')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Vote removed');
      expect(res.body.upvotes).toBe(0);
      expect(res.body.userVotes).not.toContain('upvote');

      expect(mockVoteRepository.findByRequestAndUser).toHaveBeenCalledWith('1', 1, 'upvote');
      expect(mockVoteRepository.delete).toHaveBeenCalledWith('1', 1, 'upvote');
    });

    it('removes a like successfully', async () => {
      mockVoteRepository.findByRequestAndUser.mockResolvedValue({ id: 11 });
      mockVoteRepository.delete.mockResolvedValue(undefined);
      mockVoteRepository.getCounts.mockResolvedValue({ upvotes: 3, likes: 0 });
      mockVoteRepository.getUserVoteTypes.mockResolvedValue(['upvote']);

      const res = await request(app)
        .delete('/api/votes/1/vote/like')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Vote removed');
      expect(res.body.likes).toBe(0);
    });

    it('returns 400 for invalid vote type', async () => {
      const res = await request(app)
        .delete('/api/votes/1/vote/invalid')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/upvote|like/i);
    });

    it('returns 404 when the vote does not exist', async () => {
      mockVoteRepository.findByRequestAndUser.mockResolvedValue(null);

      const res = await request(app)
        .delete('/api/votes/1/vote/upvote')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Vote not found');
    });
  });

  // ── GET /:requestId/votes ─────────────────────────────────────────

  describe('GET /api/votes/:requestId/votes', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app).get('/api/votes/1/votes');
      expect(res.status).toBe(401);
    });

    it('returns vote counts and user votes', async () => {
      mockVoteRepository.getCounts.mockResolvedValue({ upvotes: 5, likes: 3 });
      mockVoteRepository.getUserVoteTypes.mockResolvedValue(['upvote']);

      const res = await request(app)
        .get('/api/votes/1/votes')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.upvotes).toBe(5);
      expect(res.body.likes).toBe(3);
      expect(res.body.userVotes).toEqual(['upvote']);
    });

    it('returns empty userVotes when the user has not voted', async () => {
      mockVoteRepository.getCounts.mockResolvedValue({ upvotes: 10, likes: 5 });
      mockVoteRepository.getUserVoteTypes.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/votes/1/votes')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.userVotes).toEqual([]);
    });

    it('returns both vote types when the user has upvoted and liked', async () => {
      mockVoteRepository.getCounts.mockResolvedValue({ upvotes: 7, likes: 4 });
      mockVoteRepository.getUserVoteTypes.mockResolvedValue(['upvote', 'like']);

      const res = await request(app)
        .get('/api/votes/1/votes')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.userVotes).toContain('upvote');
      expect(res.body.userVotes).toContain('like');
    });
  });
});
