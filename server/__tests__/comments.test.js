import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// ── Constants ────────────────────────────────────────────────────────

const JWT_SECRET = 'test-secret';

// ── Mock repositories ────────────────────────────────────────────────

const mockCommentRepository = {
  findById: jest.fn(),
  findByIdWithAuthor: jest.fn(),
  findByRequest: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  moveToRequest: jest.fn(),
  getCommenters: jest.fn(),
  count: jest.fn(),
};

const mockMentionRepository = {
  saveMentions: jest.fn(),
  getMentions: jest.fn(),
  findUserIdsByNames: jest.fn(),
};

const mockRequestRepository = {
  findById: jest.fn(),
  findByIdOrFail: jest.fn(),
};

jest.unstable_mockModule('../src/repositories/commentRepository.js', () => ({
  commentRepository: mockCommentRepository,
  mentionRepository: mockMentionRepository,
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

const { default: commentsRoutes } = await import('../src/routes/comments.js');
const { errorHandler } = await import('../src/middleware/errorHandler.js');

// ── Build test Express app ───────────────────────────────────────────

const app = express();
app.use(express.json());
app.use('/api/comments', commentsRoutes);
app.use(errorHandler);

// ── Helpers ──────────────────────────────────────────────────────────

const generateToken = (payload) => jwt.sign(payload, JWT_SECRET);

// ── Tests ────────────────────────────────────────────────────────────

describe('Comments API', () => {
  const userToken = generateToken({ id: 1, email: 'user@example.com', role: 'employee', name: 'Test User' });
  const user2Token = generateToken({ id: 2, email: 'user2@example.com', role: 'employee', name: 'Another User' });
  const adminToken = generateToken({ id: 3, email: 'admin@example.com', role: 'admin', name: 'Admin' });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── GET /:requestId/comments ──────────────────────────────────────

  describe('GET /api/comments/:requestId/comments', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app).get('/api/comments/1/comments');
      expect(res.status).toBe(401);
    });

    it('returns empty array when there are no comments', async () => {
      mockCommentRepository.findByRequest.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/comments/1/comments')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('returns comments with author info', async () => {
      const comments = [
        { id: 1, request_id: 1, user_id: 1, content: 'First comment', author_name: 'Test User', created_at: '2024-01-01T00:00:00Z' },
        { id: 2, request_id: 1, user_id: 2, content: 'Second comment', author_name: 'Another User', created_at: '2024-01-01T01:00:00Z' },
      ];
      mockCommentRepository.findByRequest.mockResolvedValue(comments);
      mockMentionRepository.getMentions.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/comments/1/comments')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].author_name).toBe('Test User');
      expect(res.body[1].author_name).toBe('Another User');
    });

    it('includes mentions in each comment', async () => {
      const comments = [
        { id: 10, request_id: 1, user_id: 1, content: 'Hey @John!', author_name: 'Test User' },
      ];
      const mentionedUsers = [{ id: 5, name: 'John', email: 'john@example.com' }];

      mockCommentRepository.findByRequest.mockResolvedValue(comments);
      mockMentionRepository.getMentions.mockResolvedValue(mentionedUsers);

      const res = await request(app)
        .get('/api/comments/1/comments')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body[0].mentions).toEqual(mentionedUsers);
      expect(mockMentionRepository.getMentions).toHaveBeenCalledWith(10);
    });
  });

  // ── POST /:requestId/comments ─────────────────────────────────────

  describe('POST /api/comments/:requestId/comments', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app)
        .post('/api/comments/1/comments')
        .send({ content: 'Test' });
      expect(res.status).toBe(401);
    });

    it('returns 400 when content is missing', async () => {
      const res = await request(app)
        .post('/api/comments/1/comments')
        .set('Authorization', `Bearer ${userToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/required/i);
    });

    it('returns 400 when content is whitespace-only', async () => {
      const res = await request(app)
        .post('/api/comments/1/comments')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/required/i);
    });

    it('returns 404 when the request does not exist', async () => {
      const { NotFoundError } = await import('../src/errors/AppError.js');
      mockRequestRepository.findByIdOrFail.mockRejectedValue(new NotFoundError('Request'));

      const res = await request(app)
        .post('/api/comments/999/comments')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: 'Hello' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Request not found');
    });

    it('creates a comment successfully', async () => {
      mockRequestRepository.findByIdOrFail.mockResolvedValue({ id: 1 });
      mockCommentRepository.create.mockResolvedValue({ id: 50 });
      mockMentionRepository.findUserIdsByNames.mockResolvedValue([]);
      mockMentionRepository.saveMentions.mockResolvedValue(undefined);
      mockMentionRepository.getMentions.mockResolvedValue([]);
      mockCommentRepository.findByIdWithAuthor.mockResolvedValue({
        id: 50,
        request_id: 1,
        user_id: 1,
        content: 'New comment',
        author_name: 'Test User',
        author_email: 'user@example.com',
        created_at: '2024-06-01T00:00:00Z',
      });

      const res = await request(app)
        .post('/api/comments/1/comments')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: 'New comment' });

      expect(res.status).toBe(201);
      expect(res.body.content).toBe('New comment');
      expect(res.body.author_name).toBe('Test User');
      expect(res.body.mentions).toEqual([]);

      expect(mockRequestRepository.findByIdOrFail).toHaveBeenCalledWith('1');
      expect(mockCommentRepository.create).toHaveBeenCalledWith('1', 1, 'New comment');
    });

    it('trims whitespace from content before saving', async () => {
      mockRequestRepository.findByIdOrFail.mockResolvedValue({ id: 1 });
      mockCommentRepository.create.mockResolvedValue({ id: 51 });
      mockMentionRepository.findUserIdsByNames.mockResolvedValue([]);
      mockMentionRepository.saveMentions.mockResolvedValue(undefined);
      mockMentionRepository.getMentions.mockResolvedValue([]);
      mockCommentRepository.findByIdWithAuthor.mockResolvedValue({
        id: 51,
        content: 'Trimmed',
        author_name: 'Test User',
      });

      await request(app)
        .post('/api/comments/1/comments')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: '  Trimmed  ' });

      expect(mockCommentRepository.create).toHaveBeenCalledWith('1', 1, 'Trimmed');
    });

    it('processes @mentions and attaches them to the response', async () => {
      mockRequestRepository.findByIdOrFail.mockResolvedValue({ id: 1 });
      mockCommentRepository.create.mockResolvedValue({ id: 60 });
      mockMentionRepository.findUserIdsByNames.mockResolvedValue([5]);
      mockMentionRepository.saveMentions.mockResolvedValue(undefined);
      mockMentionRepository.getMentions.mockResolvedValue([
        { id: 5, name: 'John', email: 'john@example.com' },
      ]);
      mockCommentRepository.findByIdWithAuthor.mockResolvedValue({
        id: 60,
        content: 'Hey @John, check this out!',
        author_name: 'Test User',
      });

      const res = await request(app)
        .post('/api/comments/1/comments')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: 'Hey @John, check this out!' });

      expect(res.status).toBe(201);
      expect(res.body.mentions).toHaveLength(1);
      expect(res.body.mentions[0].name).toBe('John');

      expect(mockMentionRepository.findUserIdsByNames).toHaveBeenCalledWith(['John']);
      expect(mockMentionRepository.saveMentions).toHaveBeenCalledWith(60, [5]);
    });
  });

  // ── PATCH /:commentId (edit, owner only) ──────────────────────────

  describe('PATCH /api/comments/:commentId', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app)
        .patch('/api/comments/1')
        .send({ content: 'Updated' });
      expect(res.status).toBe(401);
    });

    it('returns 400 when content is empty', async () => {
      const res = await request(app)
        .patch('/api/comments/1')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: '' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/required/i);
    });

    it('returns 404 when the comment does not exist', async () => {
      mockCommentRepository.findById.mockResolvedValue(null);

      const res = await request(app)
        .patch('/api/comments/999')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: 'Updated' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Comment not found');
    });

    it('returns 403 when the user is not the comment owner', async () => {
      mockCommentRepository.findById.mockResolvedValue({
        id: 1,
        user_id: 999,
        content: 'Original',
      });

      const res = await request(app)
        .patch('/api/comments/1')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: 'Updated' });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/Not authorized/i);
    });

    it('allows the owner to update their comment', async () => {
      mockCommentRepository.findById.mockResolvedValue({
        id: 1,
        user_id: 1,
        content: 'Original',
      });
      mockCommentRepository.update.mockResolvedValue(undefined);
      mockMentionRepository.findUserIdsByNames.mockResolvedValue([]);
      mockMentionRepository.saveMentions.mockResolvedValue(undefined);
      mockMentionRepository.getMentions.mockResolvedValue([]);
      mockCommentRepository.findByIdWithAuthor.mockResolvedValue({
        id: 1,
        user_id: 1,
        content: 'Updated content',
        author_name: 'Test User',
        author_email: 'user@example.com',
      });

      const res = await request(app)
        .patch('/api/comments/1')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: 'Updated content' });

      expect(res.status).toBe(200);
      expect(res.body.content).toBe('Updated content');
      expect(res.body.mentions).toEqual([]);

      expect(mockCommentRepository.update).toHaveBeenCalledWith('1', 'Updated content');
    });

    it('updates mentions when editing a comment with new @mentions', async () => {
      mockCommentRepository.findById.mockResolvedValue({
        id: 1,
        user_id: 1,
        content: 'Original @John',
      });
      mockCommentRepository.update.mockResolvedValue(undefined);
      mockMentionRepository.findUserIdsByNames.mockResolvedValue([6]);
      mockMentionRepository.saveMentions.mockResolvedValue(undefined);
      mockMentionRepository.getMentions.mockResolvedValue([
        { id: 6, name: 'Jane', email: 'jane@example.com' },
      ]);
      mockCommentRepository.findByIdWithAuthor.mockResolvedValue({
        id: 1,
        content: 'Updated @Jane',
        author_name: 'Test User',
      });

      const res = await request(app)
        .patch('/api/comments/1')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: 'Updated @Jane' });

      expect(res.status).toBe(200);
      expect(res.body.mentions).toHaveLength(1);
      expect(res.body.mentions[0].name).toBe('Jane');

      expect(mockMentionRepository.findUserIdsByNames).toHaveBeenCalledWith(['Jane']);
      expect(mockMentionRepository.saveMentions).toHaveBeenCalledWith('1', [6]);
    });
  });

  // ── DELETE /:commentId (owner or admin) ───────────────────────────

  describe('DELETE /api/comments/:commentId', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app).delete('/api/comments/1');
      expect(res.status).toBe(401);
    });

    it('returns 404 when the comment does not exist', async () => {
      mockCommentRepository.findById.mockResolvedValue(null);

      const res = await request(app)
        .delete('/api/comments/999')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Comment not found');
    });

    it('returns 403 when the user is neither the owner nor an admin', async () => {
      mockCommentRepository.findById.mockResolvedValue({
        id: 1,
        user_id: 999,
        content: 'Not my comment',
      });

      const res = await request(app)
        .delete('/api/comments/1')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/Not authorized/i);
    });

    it('allows the owner to delete their comment', async () => {
      mockCommentRepository.findById.mockResolvedValue({
        id: 1,
        user_id: 1,
        content: 'My comment',
      });
      mockCommentRepository.delete.mockResolvedValue(undefined);

      const res = await request(app)
        .delete('/api/comments/1')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/deleted/i);
      expect(mockCommentRepository.delete).toHaveBeenCalledWith('1');
    });

    it('allows an admin to delete any comment', async () => {
      mockCommentRepository.findById.mockResolvedValue({
        id: 1,
        user_id: 999,
        content: 'Someone else comment',
      });
      mockCommentRepository.delete.mockResolvedValue(undefined);

      const res = await request(app)
        .delete('/api/comments/1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/deleted/i);
      expect(mockCommentRepository.delete).toHaveBeenCalledWith('1');
    });
  });
});
