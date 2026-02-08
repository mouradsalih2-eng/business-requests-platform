import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'test-secret';

// ── Mock all repositories / services that transitively touch Supabase ──

const mockRequestRepository = {
  findById: jest.fn(),
  findByIdOrFail: jest.fn(),
  findByIdWithCounts: jest.fn(),
  findByTitle: jest.fn(),
  findAll: jest.fn(),
  findForAnalytics: jest.fn(),
  findAllBasic: jest.fn(),
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

const mockUserRepository = {
  findById: jest.fn(),
  findByIdOrFail: jest.fn(),
  search: jest.fn(),
};

const mockRequestService = {
  merge: jest.fn(),
  getAnalytics: jest.fn(),
  search: jest.fn(),
};

jest.unstable_mockModule('../src/repositories/requestRepository.js', () => ({
  requestRepository: mockRequestRepository,
}));

jest.unstable_mockModule('../src/repositories/voteRepository.js', () => ({
  voteRepository: mockVoteRepository,
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

jest.unstable_mockModule('../src/repositories/commentRepository.js', () => ({
  commentRepository: mockCommentRepository,
  mentionRepository: mockMentionRepository,
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

jest.unstable_mockModule('../src/middleware/project.js', () => ({
  requireProject: (req, res, next) => {
    req.project = { id: 1, name: 'Default Project', slug: 'default' };
    req.projectRole = req.user?.role === 'admin' || req.user?.role === 'super_admin' ? 'admin' : 'member';
    next();
  },
  requireProjectAdmin: (req, res, next) => {
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin' && req.projectRole !== 'admin') {
      return res.status(403).json({ error: 'Project admin access required' });
    }
    next();
  },
  requireSuperAdmin: (req, res, next) => {
    if (req.user?.role !== 'super_admin') {
      return res.status(403).json({ error: 'Super admin access required' });
    }
    next();
  },
}));

jest.unstable_mockModule('../src/repositories/customFieldValueRepository.js', () => ({
  customFieldValueRepository: {
    findByRequest: jest.fn().mockResolvedValue([]),
    upsertValues: jest.fn().mockResolvedValue([]),
    findCardValuesForRequests: jest.fn().mockResolvedValue({}),
  },
}));

// Dynamic import AFTER all mocks are registered
const { default: requestsRoutes } = await import('../src/routes/requests.js');
const { errorHandler } = await import('../src/middleware/errorHandler.js');

// ── Express test app ────────────────────────────────────────

const app = express();
app.use(express.json());
app.use('/api/requests', requestsRoutes);
app.use(errorHandler);

// ── Helpers ─────────────────────────────────────────────────

const generateToken = (user) => jwt.sign(user, JWT_SECRET);

const employeeUser = { id: 1, email: 'user@example.com', role: 'employee', name: 'Test User' };
const adminUser = { id: 2, email: 'admin@example.com', role: 'admin', name: 'Admin User' };
const otherUser = { id: 3, email: 'other@example.com', role: 'employee', name: 'Other User' };

const userToken = generateToken(employeeUser);
const adminToken = generateToken(adminUser);
const otherToken = generateToken(otherUser);

// ── Tests ───────────────────────────────────────────────────

describe('Requests API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ────────────────────────── GET / ──────────────────────────

  describe('GET /api/requests', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app).get('/api/requests');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Access token required');
    });

    it('returns list of requests enriched with user votes', async () => {
      const mockRequests = [
        { id: 1, title: 'Fix login bug', status: 'pending', category: 'bug', priority: 'high', author_name: 'Test User', upvotes: 5, likes: 3, comment_count: 2 },
        { id: 2, title: 'Add dark mode', status: 'in_progress', category: 'new_feature', priority: 'medium', author_name: 'Other User', upvotes: 10, likes: 7, comment_count: 0 },
      ];

      mockRequestRepository.findAll.mockResolvedValue(mockRequests);
      mockVoteRepository.getUserVoteTypes.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/requests')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].userVotes).toBeDefined();
      expect(res.body[0].isRead).toBe(true); // non-admin, always true
      expect(mockRequestRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ userId: employeeUser.id }),
      );
    });

    it('enriches with admin read status for admin users', async () => {
      const mockRequests = [
        { id: 1, title: 'New request', status: 'pending', author_name: 'User' },
      ];

      mockRequestRepository.findAll.mockResolvedValue(mockRequests);
      mockVoteRepository.getUserVoteTypes.mockResolvedValue(['upvote']);
      mockAdminReadRepository.isRead.mockResolvedValue(false);

      const res = await request(app)
        .get('/api/requests')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body[0].isRead).toBe(false);
      expect(res.body[0].userVotes).toEqual(['upvote']);
      expect(mockAdminReadRepository.isRead).toHaveBeenCalledWith(1, adminUser.id);
    });

    it('passes query params through to findAll', async () => {
      mockRequestRepository.findAll.mockResolvedValue([]);

      await request(app)
        .get('/api/requests?status=pending&category=bug&priority=high&sort=upvotes&order=desc&myRequests=true&timePeriod=7days&search=login')
        .set('Authorization', `Bearer ${userToken}`);

      expect(mockRequestRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'pending',
          category: 'bug',
          priority: 'high',
          sort: 'upvotes',
          order: 'desc',
          myRequests: 'true',
          timePeriod: '7days',
          search: 'login',
          userId: employeeUser.id,
        }),
      );
    });

    it('returns 403 with an invalid token', async () => {
      const res = await request(app)
        .get('/api/requests')
        .set('Authorization', 'Bearer bad-token');

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Invalid token');
    });
  });

  // ─────────────────────── GET /:id ─────────────────────────

  describe('GET /api/requests/:id', () => {
    it('returns 404 if request not found', async () => {
      mockRequestRepository.findByIdWithCounts.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/requests/999')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Request not found');
    });

    it('returns request with attachments and user votes', async () => {
      const mockReq = {
        id: 1, title: 'Test Request', status: 'pending', category: 'bug',
        priority: 'high', user_id: 1, author_name: 'Test User', upvotes: 5, likes: 3,
      };
      const mockAttachments = [
        { id: 10, request_id: 1, filename: 'screenshot.png', filepath: '1234-screenshot.png' },
      ];

      mockRequestRepository.findByIdWithCounts.mockResolvedValue(mockReq);
      mockAttachmentRepository.findByRequest.mockResolvedValue(mockAttachments);
      mockVoteRepository.getUserVoteTypes.mockResolvedValue(['upvote']);

      const res = await request(app)
        .get('/api/requests/1')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(1);
      expect(res.body.title).toBe('Test Request');
      expect(res.body.attachments).toEqual(mockAttachments);
      expect(res.body.userVotes).toEqual(['upvote']);
      expect(mockAttachmentRepository.findByRequest).toHaveBeenCalledWith('1');
      expect(mockVoteRepository.getUserVoteTypes).toHaveBeenCalledWith('1', employeeUser.id);
    });

    it('returns empty attachments and votes when none exist', async () => {
      mockRequestRepository.findByIdWithCounts.mockResolvedValue({
        id: 2, title: 'Bare request', status: 'pending',
      });
      mockAttachmentRepository.findByRequest.mockResolvedValue([]);
      mockVoteRepository.getUserVoteTypes.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/requests/2')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.attachments).toEqual([]);
      expect(res.body.userVotes).toEqual([]);
    });
  });

  // ──────────────────────── POST / ──────────────────────────

  describe('POST /api/requests', () => {
    const validPayload = { title: 'New Request', category: 'bug', priority: 'high' };

    it('returns 400 if title is missing', async () => {
      const res = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ category: 'bug', priority: 'high' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/required/i);
    });

    it('returns 400 if category is missing', async () => {
      const res = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Test', priority: 'high' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/required/i);
    });

    it('returns 400 if priority is missing', async () => {
      const res = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Test', category: 'bug' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/required/i);
    });

    it('returns 400 if title is blank whitespace', async () => {
      const res = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: '   ', category: 'bug', priority: 'high' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/required/i);
    });

    it('creates a request successfully', async () => {
      const createdRequest = {
        id: 1, title: 'New Request', category: 'bug', priority: 'high',
        status: 'pending', user_id: 1, team: 'Manufacturing', region: 'Global',
      };

      mockRequestRepository.create.mockResolvedValue(createdRequest);
      mockAttachmentRepository.findByRequest.mockResolvedValue([]);

      const res = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${userToken}`)
        .send(validPayload);

      expect(res.status).toBe(201);
      expect(res.body.title).toBe('New Request');
      expect(res.body.attachments).toEqual([]);
      expect(mockRequestRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: employeeUser.id,
          title: 'New Request',
          category: 'bug',
          priority: 'high',
          team: 'Manufacturing',
          region: 'Global',
        }),
      );
    });

    it('creates a request with optional fields', async () => {
      const payload = {
        ...validPayload,
        team: 'Sales',
        region: 'EMEA',
        business_problem: 'Cannot export data',
        problem_size: 'Large',
        business_expectations: 'Export to CSV',
        expected_impact: 'High',
      };

      const createdRequest = { id: 2, ...payload, status: 'pending', user_id: 1 };
      mockRequestRepository.create.mockResolvedValue(createdRequest);
      mockAttachmentRepository.findByRequest.mockResolvedValue([]);

      const res = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${userToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(mockRequestRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          team: 'Sales',
          region: 'EMEA',
          business_problem: 'Cannot export data',
        }),
      );
    });

    it('returns 401 without authentication', async () => {
      const res = await request(app)
        .post('/api/requests')
        .send(validPayload);

      expect(res.status).toBe(401);
    });

    // ── On Behalf Of ──

    it('admin can create request on behalf of existing user', async () => {
      const targetUser = { id: 3, name: 'Other User', email: 'other@example.com', role: 'employee' };
      mockUserRepository.findById.mockResolvedValue(targetUser);

      const createdRequest = {
        id: 10, title: 'New Request', category: 'bug', priority: 'high',
        status: 'pending', user_id: 3, posted_by_admin_id: 2, on_behalf_of_user_id: 3,
      };
      mockRequestRepository.create.mockResolvedValue(createdRequest);
      mockAttachmentRepository.findByRequest.mockResolvedValue([]);

      const res = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...validPayload, on_behalf_of_user_id: 3 });

      expect(res.status).toBe(201);
      expect(mockRequestRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 3,
          posted_by_admin_id: 2,
          on_behalf_of_user_id: 3,
        }),
      );
    });

    it('admin can create request on behalf of external stakeholder', async () => {
      const createdRequest = {
        id: 11, title: 'New Request', category: 'bug', priority: 'high',
        status: 'pending', user_id: 2, posted_by_admin_id: 2, on_behalf_of_name: 'John External',
      };
      mockRequestRepository.create.mockResolvedValue(createdRequest);
      mockAttachmentRepository.findByRequest.mockResolvedValue([]);

      const res = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...validPayload, on_behalf_of_name: 'John External' });

      expect(res.status).toBe(201);
      expect(mockRequestRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 2,
          posted_by_admin_id: 2,
          on_behalf_of_name: 'John External',
        }),
      );
    });

    it('non-admin cannot use on_behalf_of_user_id', async () => {
      const res = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ ...validPayload, on_behalf_of_user_id: 3 });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/admin/i);
    });

    it('non-admin cannot use on_behalf_of_name', async () => {
      const res = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ ...validPayload, on_behalf_of_name: 'External Person' });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/admin/i);
    });

    it('returns 404 when target user does not exist', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...validPayload, on_behalf_of_user_id: 999 });

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/not found/i);
    });

    it('normal request does not set on-behalf fields', async () => {
      const createdRequest = {
        id: 12, title: 'New Request', category: 'bug', priority: 'high',
        status: 'pending', user_id: 1,
      };
      mockRequestRepository.create.mockResolvedValue(createdRequest);
      mockAttachmentRepository.findByRequest.mockResolvedValue([]);

      await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${userToken}`)
        .send(validPayload);

      const createArg = mockRequestRepository.create.mock.calls[0][0];
      expect(createArg.posted_by_admin_id).toBeUndefined();
      expect(createArg.on_behalf_of_user_id).toBeUndefined();
      expect(createArg.on_behalf_of_name).toBeUndefined();
    });
  });

  // ─────────────────────── PATCH /:id ───────────────────────

  describe('PATCH /api/requests/:id', () => {
    const existingRequest = {
      id: 1, user_id: 1, title: 'Original Title', status: 'pending',
      category: 'bug', priority: 'medium',
    };

    it('returns 404 when request does not exist (via NotFoundError)', async () => {
      const { NotFoundError } = await import('../src/errors/AppError.js');
      mockRequestRepository.findByIdOrFail.mockRejectedValue(new NotFoundError('Request'));

      const res = await request(app)
        .patch('/api/requests/999')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Updated' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Request not found');
    });

    it('returns 403 if user is neither owner nor admin (via ForbiddenError)', async () => {
      mockRequestRepository.findByIdOrFail.mockResolvedValue({ ...existingRequest, user_id: 999 });

      const res = await request(app)
        .patch('/api/requests/1')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Updated' });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/Not authorized/);
    });

    it('allows owner to update content fields', async () => {
      mockRequestRepository.findByIdOrFail.mockResolvedValue(existingRequest);
      mockRequestRepository.update.mockResolvedValue({ ...existingRequest, title: 'Updated Title' });
      mockRequestRepository.findById.mockResolvedValue({ ...existingRequest, title: 'Updated Title' });

      const res = await request(app)
        .patch('/api/requests/1')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Updated Title' });

      expect(res.status).toBe(200);
      expect(mockRequestRepository.update).toHaveBeenCalledWith('1', expect.objectContaining({ title: 'Updated Title' }));
    });

    it('allows owner to update multiple fields at once', async () => {
      mockRequestRepository.findByIdOrFail.mockResolvedValue(existingRequest);
      mockRequestRepository.update.mockResolvedValue({});
      mockRequestRepository.findById.mockResolvedValue({
        ...existingRequest, title: 'New Title', category: 'new_feature', priority: 'high',
      });

      const res = await request(app)
        .patch('/api/requests/1')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'New Title', category: 'new_feature', priority: 'high' });

      expect(res.status).toBe(200);
      expect(mockRequestRepository.update).toHaveBeenCalledWith('1', expect.objectContaining({
        title: 'New Title', category: 'new_feature', priority: 'high',
      }));
    });

    it('allows admin to change status and logs activity', async () => {
      mockRequestRepository.findByIdOrFail.mockResolvedValue({ ...existingRequest, user_id: 999 });
      mockRequestRepository.update.mockResolvedValue({});
      mockActivityRepository.create.mockResolvedValue(undefined);
      mockRequestRepository.findById.mockResolvedValue({ ...existingRequest, status: 'in_progress' });

      const res = await request(app)
        .patch('/api/requests/1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'in_progress' });

      expect(res.status).toBe(200);
      expect(mockRequestRepository.update).toHaveBeenCalledWith('1', { status: 'in_progress' });
      expect(mockActivityRepository.create).toHaveBeenCalledWith({
        requestId: '1',
        userId: adminUser.id,
        action: 'status_change',
        oldValue: 'pending',
        newValue: 'in_progress',
      });
    });

    it('does not log activity when admin sets same status', async () => {
      mockRequestRepository.findByIdOrFail.mockResolvedValue({ ...existingRequest, user_id: 999 });
      mockRequestRepository.findById.mockResolvedValue(existingRequest);

      const res = await request(app)
        .patch('/api/requests/1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'pending' });

      expect(res.status).toBe(200);
      expect(mockActivityRepository.create).not.toHaveBeenCalled();
    });

    it('allows admin to set status to each valid value', async () => {
      for (const status of ['backlog', 'in_progress', 'completed', 'rejected', 'duplicate', 'archived']) {
        jest.clearAllMocks();
        mockRequestRepository.findByIdOrFail.mockResolvedValue({ ...existingRequest, user_id: 999 });
        mockRequestRepository.update.mockResolvedValue({});
        mockActivityRepository.create.mockResolvedValue(undefined);
        mockRequestRepository.findById.mockResolvedValue({ ...existingRequest, status });

        const res = await request(app)
          .patch('/api/requests/1')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ status });

        expect(res.status).toBe(200);
        expect(mockRequestRepository.update).toHaveBeenCalledWith('1', { status });
      }
    });

    it('non-admin cannot change status (no status update, only content)', async () => {
      // Owner sending status should NOT trigger status update path (only admin can)
      mockRequestRepository.findByIdOrFail.mockResolvedValue(existingRequest);
      mockRequestRepository.update.mockResolvedValue({});
      mockRequestRepository.findById.mockResolvedValue(existingRequest);

      const res = await request(app)
        .patch('/api/requests/1')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ status: 'in_progress', title: 'Updated' });

      expect(res.status).toBe(200);
      // The status update call should not happen because user is not admin
      // But the content update (title) should happen
      expect(mockRequestRepository.update).toHaveBeenCalledWith('1', expect.objectContaining({ title: 'Updated' }));
      expect(mockActivityRepository.create).not.toHaveBeenCalled();
    });

    it('does not call update when owner sends no content fields', async () => {
      mockRequestRepository.findByIdOrFail.mockResolvedValue(existingRequest);
      mockRequestRepository.findById.mockResolvedValue(existingRequest);

      const res = await request(app)
        .patch('/api/requests/1')
        .set('Authorization', `Bearer ${userToken}`)
        .send({});

      expect(res.status).toBe(200);
      expect(mockRequestRepository.update).not.toHaveBeenCalled();
    });
  });

  // ──────────────────── DELETE /:id ─────────────────────────

  describe('DELETE /api/requests/:id', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app).delete('/api/requests/1');
      expect(res.status).toBe(401);
    });

    it('returns 403 for non-admin users', async () => {
      const res = await request(app)
        .delete('/api/requests/1')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Admin access required');
    });

    it('returns 404 when request does not exist', async () => {
      const { NotFoundError } = await import('../src/errors/AppError.js');
      mockRequestRepository.findByIdOrFail.mockRejectedValue(new NotFoundError('Request'));

      const res = await request(app)
        .delete('/api/requests/999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Request not found');
    });

    it('deletes request successfully for admin', async () => {
      mockRequestRepository.findByIdOrFail.mockResolvedValue({ id: 1, title: 'To Delete' });
      mockRequestRepository.delete.mockResolvedValue(undefined);

      const res = await request(app)
        .delete('/api/requests/1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/deleted/i);
      expect(mockRequestRepository.findByIdOrFail).toHaveBeenCalledWith('1');
      expect(mockRequestRepository.delete).toHaveBeenCalledWith('1');
    });
  });

  // ─────────────────── GET /search ──────────────────────────

  describe('GET /api/requests/search', () => {
    it('returns search results from the service', async () => {
      const mockResults = [
        { id: 1, title: 'Login bug', status: 'pending', category: 'bug', author_name: 'User', score: 90 },
        { id: 2, title: 'Login redesign', status: 'in_progress', category: 'new_feature', author_name: 'Admin', score: 50 },
      ];
      mockRequestService.search.mockResolvedValue(mockResults);

      const res = await request(app)
        .get('/api/requests/search?q=login')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(2);
      expect(mockRequestService.search).toHaveBeenCalledWith('login', undefined, 1);
    });

    it('passes limit param to the service', async () => {
      mockRequestService.search.mockResolvedValue([]);

      await request(app)
        .get('/api/requests/search?q=test&limit=5')
        .set('Authorization', `Bearer ${userToken}`);

      expect(mockRequestService.search).toHaveBeenCalledWith('test', '5', 1);
    });

    it('returns empty array for short query (handled by service)', async () => {
      mockRequestService.search.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/requests/search?q=a')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('returns 401 without authentication', async () => {
      const res = await request(app).get('/api/requests/search?q=test');
      expect(res.status).toBe(401);
    });
  });

  // ────────────── GET /:id/interactions ──────────────────────

  describe('GET /api/requests/:id/interactions', () => {
    it('returns upvoters, likers, and commenters', async () => {
      mockVoteRepository.getUpvoters.mockResolvedValue([{ id: 10, name: 'Upvoter One' }]);
      mockVoteRepository.getLikers.mockResolvedValue([{ id: 20, name: 'Liker One' }, { id: 21, name: 'Liker Two' }]);
      mockCommentRepository.getCommenters.mockResolvedValue([{ id: 30, name: 'Commenter One' }]);

      const res = await request(app)
        .get('/api/requests/1/interactions')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.upvoters).toHaveLength(1);
      expect(res.body.upvoters[0].name).toBe('Upvoter One');
      expect(res.body.likers).toHaveLength(2);
      expect(res.body.commenters).toHaveLength(1);
    });

    it('returns empty arrays when no interactions exist', async () => {
      mockVoteRepository.getUpvoters.mockResolvedValue([]);
      mockVoteRepository.getLikers.mockResolvedValue([]);
      mockCommentRepository.getCommenters.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/requests/5/interactions')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ upvoters: [], likers: [], commenters: [] });
    });

    it('returns 401 without authentication', async () => {
      const res = await request(app).get('/api/requests/1/interactions');
      expect(res.status).toBe(401);
    });
  });

  // ─────────────── POST /:id/read ───────────────────────────

  describe('POST /api/requests/:id/read', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app).post('/api/requests/1/read');
      expect(res.status).toBe(401);
    });

    it('returns 403 for non-admin users', async () => {
      const res = await request(app)
        .post('/api/requests/1/read')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Admin access required');
    });

    it('returns 404 if request does not exist', async () => {
      const { NotFoundError } = await import('../src/errors/AppError.js');
      mockRequestRepository.findByIdOrFail.mockRejectedValue(new NotFoundError('Request'));

      const res = await request(app)
        .post('/api/requests/999/read')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Request not found');
    });

    it('marks request as read for admin', async () => {
      mockRequestRepository.findByIdOrFail.mockResolvedValue({ id: 1, title: 'Request' });
      mockAdminReadRepository.markRead.mockResolvedValue(undefined);

      const res = await request(app)
        .post('/api/requests/1/read')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/read/i);
      expect(mockAdminReadRepository.markRead).toHaveBeenCalledWith('1', adminUser.id);
    });
  });
});
