import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

/**
 * Edge Case and Input Validation Tests
 *
 * Tests for:
 * - Special characters and Unicode in titles
 * - SQL injection prevention (Supabase parameterizes queries)
 * - Comment content validation
 * - Numeric ID validation
 * - Empty/whitespace inputs
 * - Authorization edge cases (malformed/expired tokens)
 * - Very long inputs
 */

// ── Constants ────────────────────────────────────────────────
const JWT_SECRET = 'test-secret';

// ── Mock all repositories ────────────────────────────────────

const mockRequestRepository = {
  findById: jest.fn(),
  findByIdOrFail: jest.fn(),
  findByIdWithCounts: jest.fn(),
  findByTitle: jest.fn(),
  findAll: jest.fn(),
  findAllBasic: jest.fn(),
  findForAnalytics: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
};

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

const mockAttachmentRepository = {
  findByRequest: jest.fn(),
  create: jest.fn(),
};

const mockActivityRepository = {
  findByRequest: jest.fn(),
  create: jest.fn(),
};

const mockAdminReadRepository = {
  isRead: jest.fn(),
  markRead: jest.fn(),
};

const mockUserRepository = {
  findById: jest.fn(),
  findByIdOrFail: jest.fn(),
  search: jest.fn(),
};

const mockRequestService = {
  search: jest.fn(),
  merge: jest.fn(),
  getAnalytics: jest.fn(),
};

jest.unstable_mockModule('../src/repositories/requestRepository.js', () => ({
  requestRepository: mockRequestRepository,
}));

jest.unstable_mockModule('../src/repositories/voteRepository.js', () => ({
  voteRepository: mockVoteRepository,
}));

jest.unstable_mockModule('../src/repositories/commentRepository.js', () => ({
  commentRepository: mockCommentRepository,
  mentionRepository: mockMentionRepository,
}));

jest.unstable_mockModule('../src/repositories/attachmentRepository.js', () => ({
  attachmentRepository: mockAttachmentRepository,
}));

jest.unstable_mockModule('../src/repositories/activityRepository.js', () => ({
  activityRepository: mockActivityRepository,
}));

jest.unstable_mockModule('../src/repositories/adminReadRepository.js', () => ({
  adminReadRepository: mockAdminReadRepository,
}));

jest.unstable_mockModule('../src/repositories/userRepository.js', () => ({
  userRepository: mockUserRepository,
}));

jest.unstable_mockModule('../src/services/requestService.js', () => ({
  requestService: mockRequestService,
}));

jest.unstable_mockModule('../src/services/storageService.js', () => ({
  storageService: {
    uploadAvatar: jest.fn(),
    deleteAvatar: jest.fn(),
    uploadAttachment: jest.fn().mockResolvedValue({ storagePath: 'test-path', publicUrl: 'https://example.supabase.co/storage/v1/object/public/attachments/test-file.png' }),
    deleteAttachments: jest.fn(),
  },
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

// ── Import routes and error infrastructure AFTER mocks ───────

const { default: requestsRoutes } = await import('../src/routes/requests.js');
const { default: commentsRoutes } = await import('../src/routes/comments.js');
const { errorHandler } = await import('../src/middleware/errorHandler.js');

// ── Create test Express app ──────────────────────────────────

const app = express();
app.use(express.json());
app.use('/api/requests', requestsRoutes);
app.use('/api/comments', commentsRoutes);
app.use(errorHandler);

// ── Helpers ──────────────────────────────────────────────────

const generateToken = (payload) => jwt.sign(payload, JWT_SECRET);

const userToken = generateToken({ id: 1, email: 'user@example.com', role: 'employee', name: 'Test User' });
const adminToken = generateToken({ id: 2, email: 'admin@example.com', role: 'admin', name: 'Admin' });

// ── Tests ────────────────────────────────────────────────────

describe('Edge Cases - Input Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Request title with special characters ──────────────────

  describe('Request title validation', () => {
    it('accepts normal title', async () => {
      mockRequestRepository.create.mockResolvedValue({
        id: 1, title: 'Normal Title', category: 'bug', priority: 'medium', status: 'pending',
        user_id: 1, team: 'Manufacturing', region: 'Global',
      });
      mockAttachmentRepository.findByRequest.mockResolvedValue([]);

      const res = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Normal Title', category: 'bug', priority: 'medium' });

      expect(res.status).toBe(201);
      expect(mockRequestRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Normal Title' })
      );
    });

    it('handles title with special characters', async () => {
      const specialTitle = 'Title with "quotes" & <special> chars!';
      mockRequestRepository.create.mockResolvedValue({
        id: 1, title: specialTitle, category: 'bug', priority: 'medium', status: 'pending',
        user_id: 1, team: 'Manufacturing', region: 'Global',
      });
      mockAttachmentRepository.findByRequest.mockResolvedValue([]);

      const res = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: specialTitle, category: 'bug', priority: 'medium' });

      expect(res.status).toBe(201);
    });

    it('handles title with Unicode characters', async () => {
      const unicodeTitle = '功能请求: 添加多语言支持';
      mockRequestRepository.create.mockResolvedValue({
        id: 1, title: unicodeTitle, category: 'new_feature', priority: 'medium', status: 'pending',
        user_id: 1, team: 'Manufacturing', region: 'Global',
      });
      mockAttachmentRepository.findByRequest.mockResolvedValue([]);

      const res = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: unicodeTitle, category: 'new_feature', priority: 'medium' });

      expect(res.status).toBe(201);
    });

    it('handles title with emojis', async () => {
      const emojiTitle = 'Bug fix needed 🐛🔧';
      mockRequestRepository.create.mockResolvedValue({
        id: 1, title: emojiTitle, category: 'bug', priority: 'high', status: 'pending',
        user_id: 1, team: 'Manufacturing', region: 'Global',
      });
      mockAttachmentRepository.findByRequest.mockResolvedValue([]);

      const res = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: emojiTitle, category: 'bug', priority: 'high' });

      expect(res.status).toBe(201);
    });

    it('rejects title that is only whitespace', async () => {
      const res = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: '   ', category: 'bug', priority: 'medium' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('required');
      expect(mockRequestRepository.create).not.toHaveBeenCalled();
    });

    it('rejects empty title', async () => {
      const res = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: '', category: 'bug', priority: 'medium' });

      expect(res.status).toBe(400);
      expect(mockRequestRepository.create).not.toHaveBeenCalled();
    });

    it('rejects missing title', async () => {
      const res = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ category: 'bug', priority: 'medium' });

      expect(res.status).toBe(400);
      expect(mockRequestRepository.create).not.toHaveBeenCalled();
    });

    it('handles very long title', async () => {
      const longTitle = 'A'.repeat(1000);
      mockRequestRepository.create.mockResolvedValue({
        id: 1, title: longTitle, category: 'bug', priority: 'low', status: 'pending',
        user_id: 1, team: 'Manufacturing', region: 'Global',
      });
      mockAttachmentRepository.findByRequest.mockResolvedValue([]);

      const res = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: longTitle, category: 'bug', priority: 'low' });

      // The route does not enforce a max length; it passes through to Supabase
      expect(res.status).toBe(201);
    });
  });

  // ── SQL injection prevention ───────────────────────────────

  describe('SQL injection prevention (Supabase parameterized queries)', () => {
    it('handles SQL injection attempt in search query', async () => {
      mockRequestService.search.mockResolvedValue([]);

      const res = await request(app)
        .get("/api/requests/search?q=test'; DROP TABLE requests; --")
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      // Supabase parameterizes all queries, so injection is not possible
      expect(res.body).toEqual([]);
    });

    it('handles SQL injection attempt in request title', async () => {
      const maliciousTitle = "'; DROP TABLE requests; --";
      mockRequestRepository.create.mockResolvedValue({
        id: 1, title: maliciousTitle, category: 'bug', priority: 'high', status: 'pending',
        user_id: 1, team: 'Manufacturing', region: 'Global',
      });
      mockAttachmentRepository.findByRequest.mockResolvedValue([]);

      const res = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: maliciousTitle, category: 'bug', priority: 'high' });

      expect(res.status).toBe(201);
      // Title stored as-is, not executed as SQL
      expect(mockRequestRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ title: maliciousTitle })
      );
    });

    it('handles SQL injection in filter parameters', async () => {
      mockRequestRepository.findAll.mockResolvedValue([]);
      mockVoteRepository.getUserVoteTypes.mockResolvedValue([]);

      const res = await request(app)
        .get("/api/requests?status=pending' OR '1'='1")
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('handles SQL injection in comment content', async () => {
      const maliciousContent = "'; DELETE FROM comments; --";
      mockRequestRepository.findByIdOrFail.mockResolvedValue({ id: 1 });
      mockCommentRepository.create.mockResolvedValue({ id: 1 });
      mockMentionRepository.findUserIdsByNames.mockResolvedValue([]);
      mockMentionRepository.saveMentions.mockResolvedValue();
      mockMentionRepository.getMentions.mockResolvedValue([]);
      mockCommentRepository.findByIdWithAuthor.mockResolvedValue({
        id: 1, request_id: 1, user_id: 1, content: maliciousContent,
        author_name: 'Test User', created_at: new Date().toISOString(),
      });

      const res = await request(app)
        .post('/api/comments/1/comments')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: maliciousContent });

      expect(res.status).toBe(201);
    });
  });

  // ── Comment content validation ─────────────────────────────

  describe('Comment content validation', () => {
    it('rejects empty comment', async () => {
      const res = await request(app)
        .post('/api/comments/1/comments')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: '' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('required');
    });

    it('rejects whitespace-only comment', async () => {
      const res = await request(app)
        .post('/api/comments/1/comments')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('required');
    });

    it('rejects comment with missing content field', async () => {
      const res = await request(app)
        .post('/api/comments/1/comments')
        .set('Authorization', `Bearer ${userToken}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('handles comment with @mentions', async () => {
      mockRequestRepository.findByIdOrFail.mockResolvedValue({ id: 1 });
      mockCommentRepository.create.mockResolvedValue({ id: 10 });
      mockMentionRepository.findUserIdsByNames.mockResolvedValue([5]);
      mockMentionRepository.saveMentions.mockResolvedValue();
      mockMentionRepository.getMentions.mockResolvedValue([{ id: 5, name: 'John', email: 'john@test.com' }]);
      mockCommentRepository.findByIdWithAuthor.mockResolvedValue({
        id: 10, request_id: 1, user_id: 1, content: 'Hey @John, please check this!',
        author_name: 'Test User', created_at: new Date().toISOString(),
      });

      const res = await request(app)
        .post('/api/comments/1/comments')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: 'Hey @John, please check this!' });

      expect(res.status).toBe(201);
      expect(res.body.mentions).toHaveLength(1);
      expect(res.body.mentions[0].name).toBe('John');
    });

    it('handles comment with multiple @mentions', async () => {
      mockRequestRepository.findByIdOrFail.mockResolvedValue({ id: 1 });
      mockCommentRepository.create.mockResolvedValue({ id: 11 });
      mockMentionRepository.findUserIdsByNames.mockResolvedValue([5, 6]);
      mockMentionRepository.saveMentions.mockResolvedValue();
      mockMentionRepository.getMentions.mockResolvedValue([
        { id: 5, name: 'Alice', email: 'alice@test.com' },
        { id: 6, name: 'Bob', email: 'bob@test.com' },
      ]);
      mockCommentRepository.findByIdWithAuthor.mockResolvedValue({
        id: 11, request_id: 1, user_id: 1, content: '@Alice and @Bob, can you both review?',
        author_name: 'Test User', created_at: new Date().toISOString(),
      });

      const res = await request(app)
        .post('/api/comments/1/comments')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: '@Alice and @Bob, can you both review?' });

      expect(res.status).toBe(201);
    });

    it('handles comment with code blocks', async () => {
      const codeComment = '```javascript\nconst x = 1;\n```';
      mockRequestRepository.findByIdOrFail.mockResolvedValue({ id: 1 });
      mockCommentRepository.create.mockResolvedValue({ id: 12 });
      mockMentionRepository.findUserIdsByNames.mockResolvedValue([]);
      mockMentionRepository.saveMentions.mockResolvedValue();
      mockMentionRepository.getMentions.mockResolvedValue([]);
      mockCommentRepository.findByIdWithAuthor.mockResolvedValue({
        id: 12, request_id: 1, user_id: 1, content: codeComment,
        author_name: 'Test User', created_at: new Date().toISOString(),
      });

      const res = await request(app)
        .post('/api/comments/1/comments')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: codeComment });

      expect(res.status).toBe(201);
    });

    it('handles comment with HTML tags (stored as-is, XSS prevention on client)', async () => {
      const htmlComment = '<script>alert("xss")</script>';
      mockRequestRepository.findByIdOrFail.mockResolvedValue({ id: 1 });
      mockCommentRepository.create.mockResolvedValue({ id: 13 });
      mockMentionRepository.findUserIdsByNames.mockResolvedValue([]);
      mockMentionRepository.saveMentions.mockResolvedValue();
      mockMentionRepository.getMentions.mockResolvedValue([]);
      mockCommentRepository.findByIdWithAuthor.mockResolvedValue({
        id: 13, request_id: 1, user_id: 1, content: htmlComment,
        author_name: 'Test User', created_at: new Date().toISOString(),
      });

      const res = await request(app)
        .post('/api/comments/1/comments')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: htmlComment });

      expect(res.status).toBe(201);
    });

    it('rejects empty content when editing a comment', async () => {
      const res = await request(app)
        .patch('/api/comments/1')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: '' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('required');
    });

    it('rejects whitespace-only content when editing a comment', async () => {
      const res = await request(app)
        .patch('/api/comments/1')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: '   ' });

      expect(res.status).toBe(400);
    });

    it('handles very long comment', async () => {
      const longComment = 'A'.repeat(5000);
      mockRequestRepository.findByIdOrFail.mockResolvedValue({ id: 1 });
      mockCommentRepository.create.mockResolvedValue({ id: 14 });
      mockMentionRepository.findUserIdsByNames.mockResolvedValue([]);
      mockMentionRepository.saveMentions.mockResolvedValue();
      mockMentionRepository.getMentions.mockResolvedValue([]);
      mockCommentRepository.findByIdWithAuthor.mockResolvedValue({
        id: 14, request_id: 1, user_id: 1, content: longComment,
        author_name: 'Test User', created_at: new Date().toISOString(),
      });

      const res = await request(app)
        .post('/api/comments/1/comments')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: longComment });

      expect(res.status).toBe(201);
    });
  });

  // ── Numeric ID validation ──────────────────────────────────

  describe('Numeric ID validation', () => {
    it('returns 404 for non-existent request ID', async () => {
      mockRequestRepository.findByIdWithCounts.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/requests/99999')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(404);
    });

    it('handles non-numeric request ID gracefully', async () => {
      mockRequestRepository.findByIdWithCounts.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/requests/abc')
        .set('Authorization', `Bearer ${userToken}`);

      // Route still executes; repo returns null for non-matching ID
      expect([200, 404]).toContain(res.status);
    });

    it('handles negative request ID', async () => {
      mockRequestRepository.findByIdWithCounts.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/requests/-1')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(404);
    });

    it('handles very large request ID', async () => {
      mockRequestRepository.findByIdWithCounts.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/requests/999999999999999')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(404);
    });

    it('handles decimal request ID', async () => {
      mockRequestRepository.findByIdWithCounts.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/requests/1.5')
        .set('Authorization', `Bearer ${userToken}`);

      expect([200, 404]).toContain(res.status);
    });

    it('returns 404 for non-existent comment when deleting', async () => {
      mockCommentRepository.findById.mockResolvedValue(null);

      const res = await request(app)
        .delete('/api/comments/99999')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('not found');
    });

    it('returns 404 for non-existent comment when editing', async () => {
      mockCommentRepository.findById.mockResolvedValue(null);

      const res = await request(app)
        .patch('/api/comments/99999')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: 'Updated content' });

      expect(res.status).toBe(404);
    });
  });

  // ── Empty and boundary conditions ──────────────────────────

  describe('Empty and boundary conditions', () => {
    it('handles empty filter values for requests', async () => {
      mockRequestRepository.findAll.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/requests?status=&category=&priority=')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('returns empty array when no requests match filters', async () => {
      mockRequestRepository.findAll.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/requests?status=nonexistent')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('handles request with minimum required fields only', async () => {
      mockRequestRepository.create.mockResolvedValue({
        id: 1, title: 'A', category: 'bug', priority: 'low', status: 'pending',
        user_id: 1, team: 'Manufacturing', region: 'Global',
      });
      mockAttachmentRepository.findByRequest.mockResolvedValue([]);

      const res = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'A', category: 'bug', priority: 'low' });

      expect(res.status).toBe(201);
    });

    it('rejects request missing category', async () => {
      const res = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Test', priority: 'low' });

      expect(res.status).toBe(400);
    });

    it('rejects request missing priority', async () => {
      const res = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Test', category: 'bug' });

      expect(res.status).toBe(400);
    });
  });

  // ── Authorization edge cases ───────────────────────────────

  describe('Authorization edge cases', () => {
    it('returns 401 with no Authorization header', async () => {
      const res = await request(app).get('/api/requests');
      expect(res.status).toBe(401);
    });

    it('returns 403 with malformed JWT token', async () => {
      const res = await request(app)
        .get('/api/requests')
        .set('Authorization', 'Bearer malformed.token.here');

      expect(res.status).toBe(403);
    });

    it('returns 403 with expired JWT token', async () => {
      const expiredToken = jwt.sign(
        { id: 1, email: 'user@example.com', role: 'employee' },
        JWT_SECRET,
        { expiresIn: '-1h' }
      );

      const res = await request(app)
        .get('/api/requests')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(403);
    });

    it('returns 403 with token signed by wrong secret', async () => {
      const wrongSecretToken = jwt.sign(
        { id: 1, email: 'user@example.com', role: 'employee' },
        'wrong-secret'
      );

      const res = await request(app)
        .get('/api/requests')
        .set('Authorization', `Bearer ${wrongSecretToken}`);

      expect(res.status).toBe(403);
    });

    it('returns 401 when missing Bearer prefix', async () => {
      const res = await request(app)
        .get('/api/requests')
        .set('Authorization', userToken);

      expect(res.status).toBe(401);
    });

    it('returns 401 with empty Authorization header', async () => {
      const res = await request(app)
        .get('/api/requests')
        .set('Authorization', '');

      expect(res.status).toBe(401);
    });

    it('returns 401 with "Bearer " followed by empty string', async () => {
      const res = await request(app)
        .get('/api/requests')
        .set('Authorization', 'Bearer ');

      expect(res.status).toBe(401);
    });

    it('returns 403 when non-admin tries to delete a request', async () => {
      const res = await request(app)
        .delete('/api/requests/1')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Admin');
    });

    it('prevents editing a comment owned by another user', async () => {
      mockCommentRepository.findById.mockResolvedValue({
        id: 1, user_id: 999, content: 'Someone else comment',
      });

      const res = await request(app)
        .patch('/api/comments/1')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: 'Trying to edit' });

      expect(res.status).toBe(403);
    });

    it('prevents deleting a comment owned by another user (non-admin)', async () => {
      mockCommentRepository.findById.mockResolvedValue({
        id: 1, user_id: 999, content: 'Someone else comment',
      });

      const res = await request(app)
        .delete('/api/comments/1')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
    });

    it('allows admin to delete a comment owned by another user', async () => {
      mockCommentRepository.findById.mockResolvedValue({
        id: 1, user_id: 999, content: 'Someone else comment',
      });
      mockCommentRepository.delete.mockResolvedValue();

      const res = await request(app)
        .delete('/api/comments/1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('deleted');
    });
  });

  // ── Search functionality edge cases ────────────────────────

  describe('Search functionality edge cases', () => {
    it('returns empty array for single character search (below minimum)', async () => {
      mockRequestService.search.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/requests/search?q=a')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('handles search with special regex characters', async () => {
      mockRequestService.search.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/requests/search?q=test.*regex')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
    });

    it('handles search with parentheses', async () => {
      mockRequestService.search.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/requests/search?q=test()')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
    });

    it('handles search with brackets', async () => {
      mockRequestService.search.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/requests/search?q=[test]')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
    });

    it('handles search with SQL injection attempt', async () => {
      mockRequestService.search.mockResolvedValue([]);

      const res = await request(app)
        .get("/api/requests/search?q='; DROP TABLE requests; --")
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('handles search with Unicode characters', async () => {
      mockRequestService.search.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/requests/search?q=%E5%8A%9F%E8%83%BD')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
    });

    it('passes limit parameter to search service', async () => {
      mockRequestService.search.mockResolvedValue([]);

      await request(app)
        .get('/api/requests/search?q=test&limit=5')
        .set('Authorization', `Bearer ${userToken}`);

      expect(mockRequestService.search).toHaveBeenCalledWith('test', '5');
    });
  });

  // ── Very long inputs ───────────────────────────────────────

  describe('Very long inputs', () => {
    it('handles very long business problem description', async () => {
      const longDescription = 'B'.repeat(10000);
      mockRequestRepository.create.mockResolvedValue({
        id: 1, title: 'Test', category: 'bug', priority: 'low', status: 'pending',
        user_id: 1, team: 'Manufacturing', region: 'Global', business_problem: longDescription,
      });
      mockAttachmentRepository.findByRequest.mockResolvedValue([]);

      const res = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Test',
          category: 'bug',
          priority: 'low',
          business_problem: longDescription,
        });

      expect(res.status).toBe(201);
    });

    it('handles very long comment content', async () => {
      const longContent = 'C'.repeat(10000);
      mockRequestRepository.findByIdOrFail.mockResolvedValue({ id: 1 });
      mockCommentRepository.create.mockResolvedValue({ id: 15 });
      mockMentionRepository.findUserIdsByNames.mockResolvedValue([]);
      mockMentionRepository.saveMentions.mockResolvedValue();
      mockMentionRepository.getMentions.mockResolvedValue([]);
      mockCommentRepository.findByIdWithAuthor.mockResolvedValue({
        id: 15, request_id: 1, user_id: 1, content: longContent,
        author_name: 'Test User', created_at: new Date().toISOString(),
      });

      const res = await request(app)
        .post('/api/comments/1/comments')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: longContent });

      expect(res.status).toBe(201);
    });

    it('handles very long search query', async () => {
      const longQuery = 'x'.repeat(500);
      mockRequestService.search.mockResolvedValue([]);

      const res = await request(app)
        .get(`/api/requests/search?q=${longQuery}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
    });
  });
});
