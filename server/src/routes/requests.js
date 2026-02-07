import { Router } from 'express';
import multer from 'multer';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { requireProject, requireProjectAdmin } from '../middleware/project.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requestRepository } from '../repositories/requestRepository.js';
import { voteRepository } from '../repositories/voteRepository.js';
import { attachmentRepository } from '../repositories/attachmentRepository.js';
import { activityRepository } from '../repositories/activityRepository.js';
import { adminReadRepository } from '../repositories/adminReadRepository.js';
import { requestService } from '../services/requestService.js';
import { storageService } from '../services/storageService.js';
import { commentRepository } from '../repositories/commentRepository.js';
import { userRepository } from '../repositories/userRepository.js';
import { customFieldValueRepository } from '../repositories/customFieldValueRepository.js';
import { ValidationError, ForbiddenError, NotFoundError } from '../errors/AppError.js';

const router = Router();

// ── File upload config (memory storage — file goes to Supabase) ──

const ALLOWED_FILE_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain', 'text/csv',
];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.csv'];

const fileFilter = (_req, file, cb) => {
  const ext = '.' + file.originalname.split('.').pop().toLowerCase();
  cb(null, ALLOWED_FILE_TYPES.includes(file.mimetype) && ALLOWED_EXTENSIONS.includes(ext));
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter,
});

// ── Routes ───────────────────────────────────────────────────

// Analytics (admin only) — before /:id
router.get('/stats/analytics', authenticateToken, requireProject, requireAdmin, asyncHandler(async (req, res) => {
  const data = await requestService.getAnalytics(req.query.period, req.project.id);
  res.json(data);
}));

// Search autocomplete — before /:id
router.get('/search', authenticateToken, requireProject, asyncHandler(async (req, res) => {
  const results = await requestService.search(req.query.q, req.query.limit, req.project.id);
  res.json(results);
}));

// List all requests
router.get('/', authenticateToken, requireProject, asyncHandler(async (req, res) => {
  const requests = await requestRepository.findAll({ ...req.query, userId: req.user.id, projectId: req.project.id });
  const isAdmin = req.user.role === 'admin' || req.user.role === 'super_admin' || req.projectRole === 'admin';

  // Enrich with user votes and read status
  const enriched = await Promise.all(requests.map(async (request) => {
    const userVotes = await voteRepository.getUserVoteTypes(request.id, req.user.id);
    let isRead = true;
    if (isAdmin) isRead = await adminReadRepository.isRead(request.id, req.user.id);
    return { ...request, userVotes, isRead };
  }));

  res.json(enriched);
}));

// Get single request
router.get('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const request = await requestRepository.findByIdWithCounts(req.params.id);
  if (!request) return res.status(404).json({ error: 'Request not found' });

  const [attachments, userVotes, customFieldValues] = await Promise.all([
    attachmentRepository.findByRequest(req.params.id),
    voteRepository.getUserVoteTypes(req.params.id, req.user.id),
    customFieldValueRepository.findByRequest(req.params.id),
  ]);

  res.json({ ...request, attachments, userVotes, customFieldValues });
}));

// Get interactions (upvoters, likers, commenters)
router.get('/:id/interactions', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const [upvoters, likers, commenters] = await Promise.all([
    voteRepository.getUpvoters(id),
    voteRepository.getLikers(id),
    commentRepository.getCommenters(id),
  ]);
  res.json({ upvoters, likers, commenters });
}));

// Create request
router.post('/', authenticateToken, requireProject, upload.array('attachments', 5), asyncHandler(async (req, res) => {
  const { title, category, priority, team, region, business_problem, problem_size, business_expectations, expected_impact, on_behalf_of_user_id, on_behalf_of_name } = req.body;
  if (!title?.trim() || !category || !priority) throw new ValidationError('Title, category, and priority are required');

  // On-behalf-of: admin-only feature
  const isOnBehalf = on_behalf_of_user_id || on_behalf_of_name;
  if (isOnBehalf && req.user.role !== 'admin' && req.user.role !== 'super_admin' && req.projectRole !== 'admin') {
    throw new ForbiddenError('Only admins can post on behalf of others');
  }

  let userId = req.user.id;
  let postedByAdminId = null;
  let onBehalfOfUserId = null;
  let onBehalfOfName = null;

  if (on_behalf_of_user_id) {
    const parsedId = parseInt(on_behalf_of_user_id, 10);
    const targetUser = await userRepository.findById(parsedId);
    if (!targetUser) throw new NotFoundError('Target user');
    userId = parsedId;
    postedByAdminId = req.user.id;
    onBehalfOfUserId = parsedId;
  } else if (on_behalf_of_name) {
    postedByAdminId = req.user.id;
    onBehalfOfName = on_behalf_of_name.trim();
  }

  const insertData = {
    user_id: userId, title, category, priority,
    project_id: req.project.id,
    team: team || 'Manufacturing', region: region || 'Global',
    business_problem: business_problem || '', problem_size: problem_size || '',
    business_expectations: business_expectations || '', expected_impact: expected_impact || '',
  };

  if (postedByAdminId) insertData.posted_by_admin_id = postedByAdminId;
  if (onBehalfOfUserId) insertData.on_behalf_of_user_id = onBehalfOfUserId;
  if (onBehalfOfName) insertData.on_behalf_of_name = onBehalfOfName;

  const request = await requestRepository.create(insertData);

  // Save custom field values if provided
  const customFieldsRaw = req.body.custom_fields;
  if (customFieldsRaw) {
    try {
      const customFields = typeof customFieldsRaw === 'string' ? JSON.parse(customFieldsRaw) : customFieldsRaw;
      if (Array.isArray(customFields) && customFields.length > 0) {
        await customFieldValueRepository.upsertValues(request.id, customFields);
      }
    } catch {
      // Ignore invalid custom_fields JSON — don't fail the whole request
    }
  }

  if (req.files?.length) {
    for (const file of req.files) {
      const { publicUrl } = await storageService.uploadAttachment(
        file.buffer, file.originalname, file.mimetype
      );
      await attachmentRepository.create(request.id, file.originalname, publicUrl);
    }
  }

  const attachments = await attachmentRepository.findByRequest(request.id);
  const customFieldValues = await customFieldValueRepository.findByRequest(request.id);
  res.status(201).json({ ...request, attachments, customFieldValues });
}));

// Update request
router.patch('/:id', authenticateToken, requireProject, asyncHandler(async (req, res) => {
  const request = await requestRepository.findByIdOrFail(req.params.id);
  const isOwner = request.user_id === req.user.id;
  const isAdmin = req.user.role === 'admin' || req.user.role === 'super_admin' || req.projectRole === 'admin';
  if (!isOwner && !isAdmin) throw new ForbiddenError('Not authorized to update this request');

  const { status, title, category, priority, team, region, business_problem, problem_size, business_expectations, expected_impact } = req.body;

  // Admin status change
  if (isAdmin && status && status !== request.status) {
    await requestRepository.update(req.params.id, { status });
    await activityRepository.create({
      requestId: req.params.id, userId: req.user.id,
      action: 'status_change', oldValue: request.status, newValue: status,
    });
  }

  // Owner content update
  if (isOwner) {
    const updates = {};
    if (title) updates.title = title;
    if (category) updates.category = category;
    if (priority) updates.priority = priority;
    if (team) updates.team = team;
    if (region) updates.region = region;
    if (business_problem !== undefined) updates.business_problem = business_problem;
    if (problem_size !== undefined) updates.problem_size = problem_size;
    if (business_expectations !== undefined) updates.business_expectations = business_expectations;
    if (expected_impact !== undefined) updates.expected_impact = expected_impact;

    if (Object.keys(updates).length > 0) {
      await requestRepository.update(req.params.id, updates);
    }
  }

  const updated = await requestRepository.findById(req.params.id);
  res.json(updated);
}));

// Activity log
router.get('/:id/activity', authenticateToken, asyncHandler(async (req, res) => {
  const activities = await activityRepository.findByRequest(req.params.id);
  res.json(activities);
}));

// Delete request (admin)
router.delete('/:id', authenticateToken, requireProject, requireAdmin, asyncHandler(async (req, res) => {
  await requestRepository.findByIdOrFail(req.params.id);
  await requestRepository.delete(req.params.id);
  res.json({ message: 'Request deleted successfully' });
}));

// Merge requests (admin)
router.post('/:id/merge', authenticateToken, requireProject, requireAdmin, asyncHandler(async (req, res) => {
  const sourceId = parseInt(req.params.id, 10);
  const { target_id, merge_votes = true, merge_comments = false } = req.body;
  if (!target_id) throw new ValidationError('Target request ID is required');

  const result = await requestService.merge({
    sourceId, targetId: parseInt(target_id, 10),
    mergeVotes: merge_votes, mergeComments: merge_comments,
    adminUserId: req.user.id,
  });
  res.json(result);
}));

// Mark as read (admin)
router.post('/:id/read', authenticateToken, requireProject, requireAdmin, asyncHandler(async (req, res) => {
  await requestRepository.findByIdOrFail(req.params.id);
  await adminReadRepository.markRead(req.params.id, req.user.id);
  res.json({ message: 'Request marked as read' });
}));

export default router;
