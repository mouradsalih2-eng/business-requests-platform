import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { requireProject } from '../middleware/project.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validateBody } from '../middleware/validate.js';
import { roadmapItemSchema, roadmapMoveSchema } from '../validation/schemas.js';
import { featureFlagRepository } from '../repositories/featureFlagRepository.js';
import { roadmapRepository } from '../repositories/roadmapRepository.js';
import { roadmapService } from '../services/roadmapService.js';
import { ForbiddenError } from '../errors/AppError.js';

const router = Router();

// Feature-flag gate
router.use(asyncHandler(async (_req, _res, next) => {
  const enabled = await featureFlagRepository.isEnabled('roadmap_kanban');
  if (!enabled) throw new ForbiddenError('Roadmap feature is currently disabled');
  next();
}));

// Get grouped roadmap
router.get('/', authenticateToken, requireProject, asyncHandler(async (req, res) => {
  const grouped = await roadmapService.getGrouped(req.project.id);
  res.json(grouped);
}));

// Create roadmap item (admin)
router.post('/', authenticateToken, requireProject, requireAdmin, validateBody(roadmapItemSchema), asyncHandler(async (req, res) => {
  const item = await roadmapService.create(req.body, req.user.id, req.project.id);
  res.status(201).json(item);
}));

// Update roadmap item (admin)
router.patch('/:id', authenticateToken, requireProject, requireAdmin, asyncHandler(async (req, res) => {
  const { title, description, category, priority, team, region } = req.body;
  await roadmapRepository.findByIdOrFail(req.params.id);

  const updates = {};
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (category !== undefined) updates.category = category;
  if (priority !== undefined) updates.priority = priority;
  if (team !== undefined) updates.team = team;
  if (region !== undefined) updates.region = region;

  if (!Object.keys(updates).length) return res.status(400).json({ error: 'No fields to update' });

  const item = await roadmapRepository.update(req.params.id, updates);
  res.json(item);
}));

// Move roadmap item (admin)
router.patch('/:id/move', authenticateToken, requireProject, requireAdmin, validateBody(roadmapMoveSchema), asyncHandler(async (req, res) => {
  const { column_status, position } = req.body;
  const item = await roadmapService.move(req.params.id, column_status, position, req.user.id);
  res.json(item);
}));

// Promote request to roadmap item (admin)
router.post('/promote', authenticateToken, requireProject, requireAdmin, asyncHandler(async (req, res) => {
  const { request_id, column_status, position } = req.body;
  const item = await roadmapService.promote(request_id, column_status, position, req.user.id, req.project.id);
  res.status(201).json(item);
}));

// Delete roadmap item (admin)
router.delete('/:id', authenticateToken, requireProject, requireAdmin, asyncHandler(async (req, res) => {
  const existing = await roadmapRepository.findByIdOrFail(req.params.id);
  await roadmapRepository.updatePositionsInColumn(existing.column_status, existing.position, -1);
  await roadmapRepository.delete(req.params.id);
  res.json({ message: 'Roadmap item deleted' });
}));

export default router;
