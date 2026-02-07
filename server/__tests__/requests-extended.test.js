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

// Dynamic imports AFTER all mocks are registered
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

const userToken = generateToken(employeeUser);
const adminToken = generateToken(adminUser);

// ── Tests ───────────────────────────────────────────────────

describe('Requests Extended API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─────────────── GET /stats/analytics ─────────────────────

  describe('GET /api/requests/stats/analytics', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app).get('/api/requests/stats/analytics');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Access token required');
    });

    it('returns 403 for non-admin users', async () => {
      const res = await request(app)
        .get('/api/requests/stats/analytics')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Admin access required');
    });

    it('returns analytics data for 7 days period', async () => {
      const analyticsData = {
        trendData: [
          { label: '2026-02-01', count: 2, pending: 1, completed: 1 },
          { label: '2026-02-02', count: 1, pending: 1, completed: 0 },
        ],
        summary: { total: 3, pending: 1, completed: 1, inProgress: 1, archived: 0 },
        categoryBreakdown: { bug: 2, new_feature: 1, optimization: 0 },
        priorityBreakdown: { high: 1, medium: 1, low: 1 },
        teamBreakdown: { Manufacturing: 1, Sales: 1, Service: 1, Energy: 0 },
        regionBreakdown: { EMEA: 1, 'North America': 1, APAC: 1, Global: 0 },
      };

      mockRequestService.getAnalytics.mockResolvedValue(analyticsData);

      const res = await request(app)
        .get('/api/requests/stats/analytics?period=7days')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.trendData).toBeDefined();
      expect(res.body.summary).toBeDefined();
      expect(res.body.summary.total).toBe(3);
      expect(res.body.summary.pending).toBe(1);
      expect(res.body.summary.completed).toBe(1);
      expect(res.body.categoryBreakdown).toBeDefined();
      expect(res.body.priorityBreakdown).toBeDefined();
      expect(res.body.teamBreakdown).toBeDefined();
      expect(res.body.regionBreakdown).toBeDefined();
      expect(mockRequestService.getAnalytics).toHaveBeenCalledWith('7days');
    });

    it('returns analytics data for 30 days period', async () => {
      const emptyAnalytics = {
        trendData: [],
        summary: { total: 0, pending: 0, completed: 0, inProgress: 0, archived: 0 },
        categoryBreakdown: { bug: 0, new_feature: 0, optimization: 0 },
        priorityBreakdown: { high: 0, medium: 0, low: 0 },
        teamBreakdown: { Manufacturing: 0, Sales: 0, Service: 0, Energy: 0 },
        regionBreakdown: { EMEA: 0, 'North America': 0, APAC: 0, Global: 0 },
      };

      mockRequestService.getAnalytics.mockResolvedValue(emptyAnalytics);

      const res = await request(app)
        .get('/api/requests/stats/analytics?period=30days')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.summary.total).toBe(0);
      expect(mockRequestService.getAnalytics).toHaveBeenCalledWith('30days');
    });

    it('returns analytics data for 90 days period', async () => {
      mockRequestService.getAnalytics.mockResolvedValue({
        trendData: [], summary: { total: 5, pending: 2, completed: 3, inProgress: 0, archived: 0 },
        categoryBreakdown: { bug: 3, new_feature: 2, optimization: 0 },
        priorityBreakdown: { high: 2, medium: 2, low: 1 },
        teamBreakdown: { Manufacturing: 2, Sales: 1, Service: 1, Energy: 1 },
        regionBreakdown: { EMEA: 2, 'North America': 1, APAC: 1, Global: 1 },
      });

      const res = await request(app)
        .get('/api/requests/stats/analytics?period=90days')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.summary.total).toBe(5);
      expect(mockRequestService.getAnalytics).toHaveBeenCalledWith('90days');
    });

    it('returns analytics data for all time (default period)', async () => {
      mockRequestService.getAnalytics.mockResolvedValue({
        trendData: [], summary: { total: 100, pending: 20, completed: 60, inProgress: 15, archived: 5 },
        categoryBreakdown: { bug: 40, new_feature: 40, optimization: 20 },
        priorityBreakdown: { high: 30, medium: 50, low: 20 },
        teamBreakdown: { Manufacturing: 25, Sales: 25, Service: 25, Energy: 25 },
        regionBreakdown: { EMEA: 25, 'North America': 25, APAC: 25, Global: 25 },
      });

      const res = await request(app)
        .get('/api/requests/stats/analytics?period=all')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.summary.total).toBe(100);
      expect(mockRequestService.getAnalytics).toHaveBeenCalledWith('all');
    });

    it('passes undefined period when no query param given', async () => {
      mockRequestService.getAnalytics.mockResolvedValue({
        trendData: [], summary: { total: 0, pending: 0, completed: 0, inProgress: 0, archived: 0 },
        categoryBreakdown: { bug: 0, new_feature: 0, optimization: 0 },
        priorityBreakdown: { high: 0, medium: 0, low: 0 },
        teamBreakdown: { Manufacturing: 0, Sales: 0, Service: 0, Energy: 0 },
        regionBreakdown: { EMEA: 0, 'North America': 0, APAC: 0, Global: 0 },
      });

      const res = await request(app)
        .get('/api/requests/stats/analytics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(mockRequestService.getAnalytics).toHaveBeenCalledWith(undefined);
    });

    it('returns 500 when the service throws an unexpected error', async () => {
      mockRequestService.getAnalytics.mockRejectedValue(new Error('Database connection lost'));

      const res = await request(app)
        .get('/api/requests/stats/analytics?period=7days')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Internal server error');
    });
  });

  // ───────────────── GET /:id/activity ──────────────────────

  describe('GET /api/requests/:id/activity', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app).get('/api/requests/1/activity');
      expect(res.status).toBe(401);
    });

    it('returns empty array when no activity exists', async () => {
      mockActivityRepository.findByRequest.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/requests/1/activity')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
      expect(mockActivityRepository.findByRequest).toHaveBeenCalledWith('1');
    });

    it('returns activity log with user names', async () => {
      const mockActivities = [
        {
          id: 1, request_id: 1, user_id: 2, action: 'status_change',
          old_value: 'pending', new_value: 'in_progress',
          created_at: '2024-01-15T10:00:00Z', user_name: 'Admin User',
        },
        {
          id: 2, request_id: 1, user_id: 2, action: 'status_change',
          old_value: 'in_progress', new_value: 'completed',
          created_at: '2024-01-20T14:00:00Z', user_name: 'Admin User',
        },
      ];

      mockActivityRepository.findByRequest.mockResolvedValue(mockActivities);

      const res = await request(app)
        .get('/api/requests/1/activity')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].action).toBe('status_change');
      expect(res.body[0].old_value).toBe('pending');
      expect(res.body[0].new_value).toBe('in_progress');
      expect(res.body[0].user_name).toBe('Admin User');
      expect(res.body[1].action).toBe('status_change');
      expect(res.body[1].new_value).toBe('completed');
    });

    it('returns merge activity entries', async () => {
      const mergeActivities = [
        {
          id: 5, request_id: 3, user_id: 2, action: 'merge',
          old_value: 'pending', new_value: 'Merged into #7',
          created_at: '2024-02-01T12:00:00Z', user_name: 'Admin User',
        },
      ];

      mockActivityRepository.findByRequest.mockResolvedValue(mergeActivities);

      const res = await request(app)
        .get('/api/requests/3/activity')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body[0].action).toBe('merge');
      expect(res.body[0].new_value).toMatch(/Merged into/);
    });

    it('non-admin users can also view activity', async () => {
      mockActivityRepository.findByRequest.mockResolvedValue([
        { id: 1, request_id: 1, action: 'status_change', user_name: 'Admin' },
      ]);

      const res = await request(app)
        .get('/api/requests/1/activity')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });
  });

  // ─────────────── POST /:id/merge ──────────────────────────

  describe('POST /api/requests/:id/merge', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app)
        .post('/api/requests/1/merge')
        .send({ target_id: 2 });

      expect(res.status).toBe(401);
    });

    it('returns 403 for non-admin users', async () => {
      const res = await request(app)
        .post('/api/requests/1/merge')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ target_id: 2 });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Admin access required');
    });

    it('returns 400 if target_id is missing', async () => {
      const res = await request(app)
        .post('/api/requests/1/merge')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Target request ID/i);
    });

    it('merges requests successfully with default options (votes=true, comments=false)', async () => {
      const mergeResult = {
        message: 'Request merged successfully',
        source: { id: 1, title: 'Source', status: 'duplicate', merged_into_id: 2 },
        target_id: 2,
        votes_transferred: true,
        comments_transferred: false,
      };

      mockRequestService.merge.mockResolvedValue(mergeResult);

      const res = await request(app)
        .post('/api/requests/1/merge')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ target_id: 2 });

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/merged/i);
      expect(res.body.target_id).toBe(2);
      expect(res.body.votes_transferred).toBe(true);
      expect(res.body.comments_transferred).toBe(false);
      expect(mockRequestService.merge).toHaveBeenCalledWith({
        sourceId: 1,
        targetId: 2,
        mergeVotes: true,
        mergeComments: false,
        adminUserId: adminUser.id,
      });
    });

    it('merges with merge_votes=false', async () => {
      const mergeResult = {
        message: 'Request merged successfully',
        source: { id: 3, status: 'duplicate', merged_into_id: 4 },
        target_id: 4,
        votes_transferred: false,
        comments_transferred: false,
      };

      mockRequestService.merge.mockResolvedValue(mergeResult);

      const res = await request(app)
        .post('/api/requests/3/merge')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ target_id: 4, merge_votes: false });

      expect(res.status).toBe(200);
      expect(res.body.votes_transferred).toBe(false);
      expect(mockRequestService.merge).toHaveBeenCalledWith(
        expect.objectContaining({ mergeVotes: false }),
      );
    });

    it('merges with merge_comments=true', async () => {
      const mergeResult = {
        message: 'Request merged successfully',
        source: { id: 5, status: 'duplicate', merged_into_id: 6 },
        target_id: 6,
        votes_transferred: true,
        comments_transferred: true,
      };

      mockRequestService.merge.mockResolvedValue(mergeResult);

      const res = await request(app)
        .post('/api/requests/5/merge')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ target_id: 6, merge_comments: true });

      expect(res.status).toBe(200);
      expect(res.body.comments_transferred).toBe(true);
      expect(mockRequestService.merge).toHaveBeenCalledWith(
        expect.objectContaining({ mergeComments: true }),
      );
    });

    it('returns 400 when service throws ValidationError (merge into itself)', async () => {
      const { ValidationError } = await import('../src/errors/AppError.js');
      mockRequestService.merge.mockRejectedValue(
        new ValidationError('Cannot merge request into itself'),
      );

      const res = await request(app)
        .post('/api/requests/1/merge')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ target_id: 1 });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/itself/);
    });

    it('returns 400 when source request is already merged', async () => {
      const { ValidationError } = await import('../src/errors/AppError.js');
      mockRequestService.merge.mockRejectedValue(
        new ValidationError('Source request is already merged'),
      );

      const res = await request(app)
        .post('/api/requests/1/merge')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ target_id: 2 });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/already merged/);
    });

    it('returns 404 when source request not found', async () => {
      const { NotFoundError } = await import('../src/errors/AppError.js');
      mockRequestService.merge.mockRejectedValue(new NotFoundError('Request'));

      const res = await request(app)
        .post('/api/requests/999/merge')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ target_id: 2 });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Request not found');
    });

    it('returns 404 when target request not found', async () => {
      const { NotFoundError } = await import('../src/errors/AppError.js');
      mockRequestService.merge.mockRejectedValue(new NotFoundError('Request'));

      const res = await request(app)
        .post('/api/requests/1/merge')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ target_id: 999 });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Request not found');
    });

    it('passes integer sourceId and targetId to the service', async () => {
      mockRequestService.merge.mockResolvedValue({
        message: 'Request merged successfully',
        source: { id: 10 }, target_id: 20,
        votes_transferred: true, comments_transferred: false,
      });

      await request(app)
        .post('/api/requests/10/merge')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ target_id: 20 });

      expect(mockRequestService.merge).toHaveBeenCalledWith(
        expect.objectContaining({ sourceId: 10, targetId: 20 }),
      );
    });
  });

  // ──────────── Filtering and query params ──────────────────

  describe('Request filtering', () => {
    beforeEach(() => {
      mockVoteRepository.getUserVoteTypes.mockResolvedValue([]);
    });

    it('passes timePeriod=today through to findAll', async () => {
      mockRequestRepository.findAll.mockResolvedValue([]);

      await request(app)
        .get('/api/requests?timePeriod=today')
        .set('Authorization', `Bearer ${userToken}`);

      expect(mockRequestRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ timePeriod: 'today' }),
      );
    });

    it('passes timePeriod=7days through to findAll', async () => {
      mockRequestRepository.findAll.mockResolvedValue([]);

      await request(app)
        .get('/api/requests?timePeriod=7days')
        .set('Authorization', `Bearer ${userToken}`);

      expect(mockRequestRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ timePeriod: '7days' }),
      );
    });

    it('passes timePeriod=30days through to findAll', async () => {
      mockRequestRepository.findAll.mockResolvedValue([]);

      await request(app)
        .get('/api/requests?timePeriod=30days')
        .set('Authorization', `Bearer ${userToken}`);

      expect(mockRequestRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ timePeriod: '30days' }),
      );
    });

    it('passes search term through to findAll', async () => {
      mockRequestRepository.findAll.mockResolvedValue([]);

      await request(app)
        .get('/api/requests?search=dashboard')
        .set('Authorization', `Bearer ${userToken}`);

      expect(mockRequestRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'dashboard' }),
      );
    });

    it('passes sort=upvotes through to findAll', async () => {
      mockRequestRepository.findAll.mockResolvedValue([]);

      await request(app)
        .get('/api/requests?sort=upvotes&order=desc')
        .set('Authorization', `Bearer ${userToken}`);

      expect(mockRequestRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ sort: 'upvotes', order: 'desc' }),
      );
    });

    it('passes sort=likes through to findAll', async () => {
      mockRequestRepository.findAll.mockResolvedValue([]);

      await request(app)
        .get('/api/requests?sort=likes')
        .set('Authorization', `Bearer ${userToken}`);

      expect(mockRequestRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ sort: 'likes' }),
      );
    });

    it('passes myRequests=true through to findAll with userId', async () => {
      mockRequestRepository.findAll.mockResolvedValue([]);

      await request(app)
        .get('/api/requests?myRequests=true')
        .set('Authorization', `Bearer ${userToken}`);

      expect(mockRequestRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ myRequests: 'true', userId: employeeUser.id }),
      );
    });

    it('passes multiple filter params simultaneously', async () => {
      mockRequestRepository.findAll.mockResolvedValue([]);

      await request(app)
        .get('/api/requests?status=in_progress&category=new_feature&priority=medium&sort=upvotes&timePeriod=30days&search=feature')
        .set('Authorization', `Bearer ${userToken}`);

      expect(mockRequestRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'in_progress',
          category: 'new_feature',
          priority: 'medium',
          sort: 'upvotes',
          timePeriod: '30days',
          search: 'feature',
          userId: employeeUser.id,
        }),
      );
    });
  });

  // ──────────── Archived requests exclusion ─────────────────

  describe('Archived requests exclusion', () => {
    beforeEach(() => {
      mockVoteRepository.getUserVoteTypes.mockResolvedValue([]);
    });

    it('excludes archived by default (repository receives no status=archived)', async () => {
      mockRequestRepository.findAll.mockResolvedValue([
        { id: 1, title: 'Active request', status: 'pending' },
      ]);

      const res = await request(app)
        .get('/api/requests')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      // The route passes query params directly; the repository handles exclusion
      const callArgs = mockRequestRepository.findAll.mock.calls[0][0];
      expect(callArgs.status).toBeUndefined();
    });

    it('includes archived when specifically filtered', async () => {
      mockRequestRepository.findAll.mockResolvedValue([
        { id: 5, title: 'Archived request', status: 'archived' },
      ]);

      const res = await request(app)
        .get('/api/requests?status=archived')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(mockRequestRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'archived' }),
      );
    });

    it('returns only the status-filtered requests when filtering for pending', async () => {
      mockRequestRepository.findAll.mockResolvedValue([
        { id: 1, title: 'Pending 1', status: 'pending' },
        { id: 2, title: 'Pending 2', status: 'pending' },
      ]);

      const res = await request(app)
        .get('/api/requests?status=pending')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(mockRequestRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'pending' }),
      );
    });
  });

  // ────────── Admin read tracking in list view ──────────────

  describe('Admin read tracking in list view', () => {
    it('tracks isRead=true when admin has read the request', async () => {
      mockRequestRepository.findAll.mockResolvedValue([
        { id: 1, title: 'Read request', status: 'pending' },
      ]);
      mockVoteRepository.getUserVoteTypes.mockResolvedValue([]);
      mockAdminReadRepository.isRead.mockResolvedValue(true);

      const res = await request(app)
        .get('/api/requests')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body[0].isRead).toBe(true);
    });

    it('tracks isRead=false when admin has not read the request', async () => {
      mockRequestRepository.findAll.mockResolvedValue([
        { id: 1, title: 'Unread request', status: 'pending' },
      ]);
      mockVoteRepository.getUserVoteTypes.mockResolvedValue([]);
      mockAdminReadRepository.isRead.mockResolvedValue(false);

      const res = await request(app)
        .get('/api/requests')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body[0].isRead).toBe(false);
    });

    it('does not check admin read status for non-admin users', async () => {
      mockRequestRepository.findAll.mockResolvedValue([
        { id: 1, title: 'Some request', status: 'pending' },
      ]);
      mockVoteRepository.getUserVoteTypes.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/requests')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body[0].isRead).toBe(true); // default for non-admin
      expect(mockAdminReadRepository.isRead).not.toHaveBeenCalled();
    });

    it('handles multiple requests with mixed read states', async () => {
      mockRequestRepository.findAll.mockResolvedValue([
        { id: 1, title: 'Request 1', status: 'pending' },
        { id: 2, title: 'Request 2', status: 'in_progress' },
        { id: 3, title: 'Request 3', status: 'completed' },
      ]);
      mockVoteRepository.getUserVoteTypes.mockResolvedValue([]);
      mockAdminReadRepository.isRead
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);

      const res = await request(app)
        .get('/api/requests')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body[0].isRead).toBe(true);
      expect(res.body[1].isRead).toBe(false);
      expect(res.body[2].isRead).toBe(true);
      expect(mockAdminReadRepository.isRead).toHaveBeenCalledTimes(3);
    });
  });
});
