import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { featureFlagRepository } from '../repositories/featureFlagRepository.js';
import { ValidationError } from '../errors/AppError.js';

const router = Router();

// Get all flags (public)
router.get('/', asyncHandler(async (_req, res) => {
  const flags = await featureFlagRepository.findAll();
  res.json(flags);
}));

// Toggle flag (admin)
router.patch('/:name', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { name } = req.params;
  const { enabled } = req.body;

  if (typeof enabled !== 'boolean') throw new ValidationError('enabled must be a boolean');

  const existing = await featureFlagRepository.findByName(name);
  if (!existing) return res.status(404).json({ error: 'Feature flag not found' });

  const updated = await featureFlagRepository.update(name, enabled);
  res.json(updated);
}));

// Re-export helper for other modules
export async function isFeatureEnabled(name) {
  return featureFlagRepository.isEnabled(name);
}

export default router;
