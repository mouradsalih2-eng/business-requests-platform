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
const { default: commentsRoutes } = await import('../src/routes/comments.js');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/comments', commentsRoutes);

// Helper to generate tokens
const generateToken = (user) => jwt.sign(user, JWT_SECRET);

describe('Comments API', () => {
  const userToken = generateToken({ id: 1, email: 'user@example.com', role: 'user', name: 'Test User' });
  const user2Token = generateToken({ id: 2, email: 'user2@example.com', role: 'user', name: 'Another User' });
  const adminToken = generateToken({ id: 3, email: 'admin@example.com', role: 'admin', name: 'Admin' });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/comments/:requestId/comments', () => {
    it('returns 401 without authentication', async () => {
      const response = await request(app).get('/api/comments/1/comments');
      expect(response.status).toBe(401);
    });

    it('returns empty array if no comments', async () => {
      mockDb.all.mockReturnValue([]);

      const response = await request(app)
        .get('/api/comments/1/comments')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('returns comments with author info', async () => {
      const mockComments = [
        {
          id: 1,
          request_id: 1,
          user_id: 1,
          content: 'This is a comment',
          created_at: '2024-01-01T00:00:00Z',
          author_name: 'Test User',
          author_email: 'test@example.com',
        },
        {
          id: 2,
          request_id: 1,
          user_id: 2,
          content: 'Another comment',
          created_at: '2024-01-01T01:00:00Z',
          author_name: 'Another User',
          author_email: 'another@example.com',
        },
      ];

      mockDb.all.mockReturnValue(mockComments);

      const response = await request(app)
        .get('/api/comments/1/comments')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(2);
      expect(response.body[0].author_name).toBe('Test User');
      expect(response.body[1].author_name).toBe('Another User');
    });

    it('includes mentions in response', async () => {
      mockDb.all
        .mockReturnValueOnce([
          { id: 1, content: 'Hey @John!', author_name: 'User' },
        ])
        .mockReturnValueOnce([
          { id: 5, name: 'John', email: 'john@example.com' },
        ]);

      const response = await request(app)
        .get('/api/comments/1/comments')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body[0].mentions).toBeDefined();
    });
  });

  describe('POST /api/comments/:requestId/comments', () => {
    it('returns 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/comments/1/comments')
        .send({ content: 'Test comment' });
      expect(response.status).toBe(401);
    });

    it('returns 400 if content is missing', async () => {
      const response = await request(app)
        .post('/api/comments/1/comments')
        .set('Authorization', `Bearer ${userToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    it('returns 400 if content is empty', async () => {
      const response = await request(app)
        .post('/api/comments/1/comments')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: '   ' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    it('returns 404 if request not found', async () => {
      mockDb.get.mockReturnValue(null);

      const response = await request(app)
        .post('/api/comments/999/comments')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: 'Test comment' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Request not found');
    });

    it('creates comment successfully', async () => {
      mockDb.get
        .mockReturnValueOnce({ id: 1 }) // request exists
        .mockReturnValueOnce({
          id: 1,
          request_id: 1,
          user_id: 1,
          content: 'New comment',
          created_at: '2024-01-01T00:00:00Z',
          author_name: 'Test User',
          author_email: 'test@example.com',
        });

      mockDb.run.mockReturnValue({ lastInsertRowid: 1 });
      mockDb.all.mockReturnValue([]); // no mentions

      const response = await request(app)
        .post('/api/comments/1/comments')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: 'New comment' });

      expect(response.status).toBe(201);
      expect(response.body.content).toBe('New comment');
      expect(response.body.author_name).toBe('Test User');
    });

    it('trims whitespace from content', async () => {
      mockDb.get
        .mockReturnValueOnce({ id: 1 })
        .mockReturnValueOnce({
          id: 1,
          content: 'Trimmed content',
          author_name: 'Test User',
          author_email: 'test@example.com',
        });

      mockDb.run.mockReturnValue({ lastInsertRowid: 1 });
      mockDb.all.mockReturnValue([]);

      const response = await request(app)
        .post('/api/comments/1/comments')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: '  Trimmed content  ' });

      expect(response.status).toBe(201);
      // Check that run was called with trimmed content
      const runCall = mockDb.run.mock.calls[0];
      expect(runCall[1][2]).toBe('Trimmed content');
    });

    it('handles comments with @mentions', async () => {
      mockDb.get
        .mockReturnValueOnce({ id: 1 }) // request exists
        .mockReturnValueOnce({ id: 5, name: 'John' }) // mentioned user found
        .mockReturnValueOnce({
          id: 1,
          content: 'Hey @John, check this out!',
          author_name: 'Test User',
          author_email: 'test@example.com',
        });

      mockDb.run.mockReturnValue({ lastInsertRowid: 1 });
      mockDb.all.mockReturnValue([{ id: 5, name: 'John', email: 'john@example.com' }]);

      const response = await request(app)
        .post('/api/comments/1/comments')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: 'Hey @John, check this out!' });

      expect(response.status).toBe(201);
      expect(response.body.mentions).toBeDefined();
    });
  });

  describe('PATCH /api/comments/:commentId', () => {
    it('returns 401 without authentication', async () => {
      const response = await request(app)
        .patch('/api/comments/1')
        .send({ content: 'Updated' });
      expect(response.status).toBe(401);
    });

    it('returns 400 if content is empty', async () => {
      const response = await request(app)
        .patch('/api/comments/1')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: '' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    it('returns 404 if comment not found', async () => {
      mockDb.get.mockReturnValue(null);

      const response = await request(app)
        .patch('/api/comments/999')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: 'Updated' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Comment not found');
    });

    it('returns 403 if user is not comment owner', async () => {
      mockDb.get.mockReturnValue({
        id: 1,
        user_id: 999, // different user
        content: 'Original',
      });

      const response = await request(app)
        .patch('/api/comments/1')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: 'Updated' });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Not authorized');
    });

    it('allows owner to update comment', async () => {
      mockDb.get
        .mockReturnValueOnce({
          id: 1,
          user_id: 1, // same user
          content: 'Original',
        })
        .mockReturnValueOnce({
          id: 1,
          user_id: 1,
          content: 'Updated content',
          author_name: 'Test User',
          author_email: 'test@example.com',
        });

      mockDb.run.mockReturnValue({ changes: 1 });
      mockDb.all.mockReturnValue([]);

      const response = await request(app)
        .patch('/api/comments/1')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: 'Updated content' });

      expect(response.status).toBe(200);
      expect(response.body.content).toBe('Updated content');
    });

    it('updates mentions when editing comment', async () => {
      mockDb.get
        .mockReturnValueOnce({
          id: 1,
          user_id: 1,
          content: 'Original @John',
        })
        .mockReturnValueOnce({ id: 5, name: 'Jane' }) // new mentioned user
        .mockReturnValueOnce({
          id: 1,
          content: 'Updated @Jane',
          author_name: 'Test User',
          author_email: 'test@example.com',
        });

      mockDb.run.mockReturnValue({ changes: 1 });
      mockDb.all.mockReturnValue([{ id: 6, name: 'Jane', email: 'jane@example.com' }]);

      const response = await request(app)
        .patch('/api/comments/1')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: 'Updated @Jane' });

      expect(response.status).toBe(200);
      expect(response.body.mentions).toBeDefined();
    });
  });

  describe('DELETE /api/comments/:commentId', () => {
    it('returns 401 without authentication', async () => {
      const response = await request(app).delete('/api/comments/1');
      expect(response.status).toBe(401);
    });

    it('returns 404 if comment not found', async () => {
      mockDb.get.mockReturnValue(null);

      const response = await request(app)
        .delete('/api/comments/999')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Comment not found');
    });

    it('returns 403 if user is not owner or admin', async () => {
      mockDb.get.mockReturnValue({
        id: 1,
        user_id: 999,
        content: 'Comment',
      });

      const response = await request(app)
        .delete('/api/comments/1')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Not authorized');
    });

    it('allows owner to delete comment', async () => {
      mockDb.get.mockReturnValue({
        id: 1,
        user_id: 1, // same user
        content: 'My comment',
      });

      mockDb.run.mockReturnValue({ changes: 1 });

      const response = await request(app)
        .delete('/api/comments/1')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('deleted');
    });

    it('allows admin to delete any comment', async () => {
      mockDb.get.mockReturnValue({
        id: 1,
        user_id: 999, // different user
        content: 'Someone else comment',
      });

      mockDb.run.mockReturnValue({ changes: 1 });

      const response = await request(app)
        .delete('/api/comments/1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('deleted');
    });
  });
});
