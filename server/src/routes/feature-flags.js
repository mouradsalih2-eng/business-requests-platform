import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { requireProject } from '../middleware/project.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { featureFlagRepository } from '../repositories/featureFlagRepository.js';
import { ValidationError } from '../errors/AppError.js';

const router = Router();

// Get all flags — optionally scoped to project via X-Project-Id header
router.get('/', asyncHandler(async (req, res) => {
  const projectId = parseInt(req.headers['x-project-id'], 10) || null;
  const flags = await featureFlagRepository.findAll(projectId);
  res.json(flags);
}));

// Toggle flag (admin)
router.patch('/:name', authenticateToken, requireProject, requireAdmin, asyncHandler(async (req, res) => {
  const { name } = req.params;
  const { enabled } = req.body;

  if (typeof enabled !== 'boolean') throw new ValidationError('enabled must be a boolean');

  const existing = await featureFlagRepository.findByName(name, req.project.id);
  if (!existing) return res.status(404).json({ error: 'Feature flag not found' });

  const updated = await featureFlagRepository.update(name, enabled, req.project.id);
  res.json(updated);
}));

// Re-export helper for other modules
export async function isFeatureEnabled(name) {
  return featureFlagRepository.isEnabled(name);
}

export default router;
