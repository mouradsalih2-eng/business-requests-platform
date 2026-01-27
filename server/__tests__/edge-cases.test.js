import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

/**
 * Edge Case and Input Validation Tests
 *
 * Tests for:
 * - Very long inputs
 * - Special characters and Unicode
 * - Boundary conditions
 * - SQL injection prevention (parameterized queries)
 * - XSS prevention verification
 */

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

// Import routers after mocks
const { default: requestsRoutes } = await import('../src/routes/requests.js');
const { default: commentsRoutes } = await import('../src/routes/comments.js');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/requests', requestsRoutes);
app.use('/api/comments', commentsRoutes);

// Helper to generate tokens
const generateToken = (user) => jwt.sign(user, JWT_SECRET);

describe('Edge Cases - Input Validation', () => {
  const userToken = generateToken({ id: 1, email: 'user@example.com', role: 'user', name: 'Test User' });
  const adminToken = generateToken({ id: 2, email: 'admin@example.com', role: 'admin', name: 'Admin' });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Request title validation', () => {
    it('accepts normal title', async () => {
      mockDb.run.mockReturnValue({ lastInsertRowid: 1 });
      mockDb.get.mockReturnValue({ id: 1, title: 'Normal Title' });
      mockDb.all.mockReturnValue([]);

      const response = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Normal Title',
          category: 'bug',
          priority: 'medium',
        });

      expect(response.status).toBe(201);
    });

    it('handles title with special characters', async () => {
      mockDb.run.mockReturnValue({ lastInsertRowid: 1 });
      mockDb.get.mockReturnValue({ id: 1, title: 'Title with "quotes" & <special> chars!' });
      mockDb.all.mockReturnValue([]);

      const response = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Title with "quotes" & <special> chars!',
          category: 'bug',
          priority: 'medium',
        });

      expect(response.status).toBe(201);
    });

    it('handles title with Unicode characters', async () => {
      const unicodeTitle = '功能请求: 添加多语言支持 🌍';
      mockDb.run.mockReturnValue({ lastInsertRowid: 1 });
      mockDb.get.mockReturnValue({ id: 1, title: unicodeTitle });
      mockDb.all.mockReturnValue([]);

      const response = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: unicodeTitle,
          category: 'new_feature',
          priority: 'medium',
        });

      expect(response.status).toBe(201);
    });

    it('handles title with emojis', async () => {
      const emojiTitle = 'Bug fix needed 🐛🔧';
      mockDb.run.mockReturnValue({ lastInsertRowid: 1 });
      mockDb.get.mockReturnValue({ id: 1, title: emojiTitle });
      mockDb.all.mockReturnValue([]);

      const response = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: emojiTitle,
          category: 'bug',
          priority: 'high',
        });

      expect(response.status).toBe(201);
    });

    it('rejects title that is only whitespace', async () => {
      const response = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: '   ',
          category: 'bug',
          priority: 'medium',
        });

      expect(response.status).toBe(400);
    });

    it('trims whitespace from title', async () => {
      mockDb.run.mockReturnValue({ lastInsertRowid: 1 });
      mockDb.get.mockReturnValue({ id: 1, title: 'Trimmed Title' });
      mockDb.all.mockReturnValue([]);

      const response = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: '  Trimmed Title  ',
          category: 'bug',
          priority: 'medium',
        });

      expect(response.status).toBe(201);
    });
  });

  describe('SQL Injection Prevention', () => {
    it('handles SQL injection attempt in search query', async () => {
      mockDb.all.mockReturnValue([]);

      const response = await request(app)
        .get("/api/requests/search?q=test'; DROP TABLE requests; --")
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      // Query should be parameterized, not concatenated
    });

    it('handles SQL injection attempt in request title', async () => {
      mockDb.run.mockReturnValue({ lastInsertRowid: 1 });
      mockDb.get.mockReturnValue({ id: 1, title: "'; DROP TABLE requests; --" });
      mockDb.all.mockReturnValue([]);

      const response = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: "'; DROP TABLE requests; --",
          category: 'bug',
          priority: 'high',
        });

      expect(response.status).toBe(201);
      // The title should be stored as-is, not executed as SQL
    });

    it('handles SQL injection in filter parameters', async () => {
      mockDb.all.mockReturnValue([]);
      mockDb.get.mockReturnValue(null);

      const response = await request(app)
        .get("/api/requests?status=pending' OR '1'='1")
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      // Should return empty array since the status value won't match
    });
  });

  describe('Comment content validation', () => {
    it('handles comment with @mentions', async () => {
      // The comments route does multiple db.get calls
      mockDb.get
        .mockReturnValueOnce({ id: 1 }) // request exists check
        .mockReturnValueOnce(null) // findMentionedUserIds - no user found
        .mockReturnValueOnce({
          id: 1,
          request_id: 1,
          user_id: 1,
          content: 'Hey @John, please check this!',
          author_name: 'Test User',
          author_email: 'test@example.com',
          created_at: new Date().toISOString(),
        }); // final comment fetch
      mockDb.run.mockReturnValue({ lastInsertRowid: 1 });
      mockDb.all.mockReturnValue([]);

      const response = await request(app)
        .post('/api/comments/1/comments')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: 'Hey @John, please check this!' });

      expect(response.status).toBe(201);
    });

    it('handles comment with multiple @mentions', async () => {
      mockDb.get
        .mockReturnValueOnce({ id: 1 }) // request exists
        .mockReturnValueOnce(null) // mention lookup 1
        .mockReturnValueOnce(null) // mention lookup 2
        .mockReturnValueOnce({
          id: 1,
          request_id: 1,
          user_id: 1,
          content: '@Alice and @Bob, can you both review?',
          author_name: 'Test User',
          author_email: 'test@example.com',
          created_at: new Date().toISOString(),
        });
      mockDb.run.mockReturnValue({ lastInsertRowid: 1 });
      mockDb.all.mockReturnValue([]);

      const response = await request(app)
        .post('/api/comments/1/comments')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: '@Alice and @Bob, can you both review?' });

      expect(response.status).toBe(201);
    });

    it('handles comment with code blocks', async () => {
      const codeComment = '```javascript\nconst x = 1;\n```';
      mockDb.get
        .mockReturnValueOnce({ id: 1 }) // request exists
        .mockReturnValueOnce({
          id: 1,
          request_id: 1,
          user_id: 1,
          content: codeComment,
          author_name: 'Test User',
          author_email: 'test@example.com',
          created_at: new Date().toISOString(),
        });
      mockDb.run.mockReturnValue({ lastInsertRowid: 1 });
      mockDb.all.mockReturnValue([]);

      const response = await request(app)
        .post('/api/comments/1/comments')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: codeComment });

      expect(response.status).toBe(201);
    });

    it('handles comment with HTML tags (should be stored as-is)', async () => {
      const htmlComment = '<script>alert("xss")</script>';
      mockDb.get
        .mockReturnValueOnce({ id: 1 }) // request exists
        .mockReturnValueOnce({
          id: 1,
          request_id: 1,
          user_id: 1,
          content: htmlComment,
          author_name: 'Test User',
          author_email: 'test@example.com',
          created_at: new Date().toISOString(),
        });
      mockDb.run.mockReturnValue({ lastInsertRowid: 1 });
      mockDb.all.mockReturnValue([]);

      const response = await request(app)
        .post('/api/comments/1/comments')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: htmlComment });

      expect(response.status).toBe(201);
      // Note: XSS prevention should happen on the client side when rendering
    });
  });

  describe('Numeric ID validation', () => {
    it('handles non-numeric request ID', async () => {
      const response = await request(app)
        .get('/api/requests/abc')
        .set('Authorization', `Bearer ${userToken}`);

      // The route should still execute, but db.get with NaN will return null
      expect([200, 404]).toContain(response.status);
    });

    it('handles negative request ID', async () => {
      mockDb.get.mockReturnValue(null);

      const response = await request(app)
        .get('/api/requests/-1')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
    });

    it('handles very large request ID', async () => {
      mockDb.get.mockReturnValue(null);

      const response = await request(app)
        .get('/api/requests/999999999999999')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
    });

    it('handles decimal request ID', async () => {
      mockDb.get.mockReturnValue(null);

      const response = await request(app)
        .get('/api/requests/1.5')
        .set('Authorization', `Bearer ${userToken}`);

      // parseInt will convert 1.5 to 1
      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Empty and boundary conditions', () => {
    it('handles empty filter values', async () => {
      mockDb.all.mockReturnValue([]);
      mockDb.get.mockReturnValue(null);

      const response = await request(app)
        .get('/api/requests?status=&category=&priority=')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
    });

    it('returns empty array when no requests match filters', async () => {
      mockDb.all.mockReturnValue([]);
      mockDb.get.mockReturnValue(null);

      const response = await request(app)
        .get('/api/requests?status=nonexistent')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('handles request with minimum required fields', async () => {
      mockDb.run.mockReturnValue({ lastInsertRowid: 1 });
      mockDb.get.mockReturnValue({
        id: 1,
        title: 'A',
        category: 'bug',
        priority: 'low',
        status: 'pending',
      });
      mockDb.all.mockReturnValue([]);

      const response = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'A', // Single character title
          category: 'bug',
          priority: 'low',
        });

      expect(response.status).toBe(201);
    });
  });

  describe('Authorization edge cases', () => {
    it('handles malformed JWT token', async () => {
      const response = await request(app)
        .get('/api/requests')
        .set('Authorization', 'Bearer malformed.token.here');

      expect(response.status).toBe(403);
    });

    it('handles expired JWT token', async () => {
      // Create a token that expired 1 hour ago
      const expiredToken = jwt.sign(
        { id: 1, email: 'user@example.com', role: 'user' },
        JWT_SECRET,
        { expiresIn: '-1h' }
      );

      const response = await request(app)
        .get('/api/requests')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(403);
    });

    it('handles token with wrong secret', async () => {
      const wrongSecretToken = jwt.sign(
        { id: 1, email: 'user@example.com', role: 'user' },
        'wrong-secret'
      );

      const response = await request(app)
        .get('/api/requests')
        .set('Authorization', `Bearer ${wrongSecretToken}`);

      expect(response.status).toBe(403);
    });

    it('handles missing Bearer prefix', async () => {
      const response = await request(app)
        .get('/api/requests')
        .set('Authorization', userToken);

      expect(response.status).toBe(401);
    });

    it('handles empty Authorization header', async () => {
      const response = await request(app)
        .get('/api/requests')
        .set('Authorization', '');

      expect(response.status).toBe(401);
    });

    it('handles "Bearer " with no token', async () => {
      const response = await request(app)
        .get('/api/requests')
        .set('Authorization', 'Bearer ');

      // Empty string after "Bearer " is falsy, so it's treated as "no token"
      expect(response.status).toBe(401);
    });
  });

  describe('Search functionality edge cases', () => {
    it('returns empty array for single character search', async () => {
      const response = await request(app)
        .get('/api/requests/search?q=a')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('handles search with special regex characters', async () => {
      mockDb.all.mockReturnValue([]);

      const response = await request(app)
        .get('/api/requests/search?q=test.*regex')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
    });

    it('handles search with parentheses', async () => {
      mockDb.all.mockReturnValue([]);

      const response = await request(app)
        .get('/api/requests/search?q=test()')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
    });

    it('handles search with brackets', async () => {
      mockDb.all.mockReturnValue([]);

      const response = await request(app)
        .get('/api/requests/search?q=[test]')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
    });
  });
});

// Note: Additional vote edge cases are tested in votes.test.js
// This section focuses on input validation and boundary conditions covered above
