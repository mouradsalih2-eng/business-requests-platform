import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requireSuperAdmin } from '../middleware/project.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { superAdminService } from '../services/superAdminService.js';

const router = Router();

// All routes require super_admin
router.use(authenticateToken, requireSuperAdmin);

// Get overview of all projects with stats
router.get('/projects', asyncHandler(async (_req, res) => {
  const overviews = await superAdminService.getProjectOverviews();
  res.json(overviews);
}));

// Get global stats
router.get('/stats', asyncHandler(async (_req, res) => {
  const stats = await superAdminService.getGlobalStats();
  res.json(stats);
}));

// Get cross-project trend data
router.get('/trends', asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days, 10) || 30;
  const trends = await superAdminService.getCrossProjectTrends(days);
  res.json(trends);
}));

// Get status breakdown per project
router.get('/status-breakdown', asyncHandler(async (_req, res) => {
  const breakdown = await superAdminService.getStatusBreakdown();
  res.json(breakdown);
}));

// Get members by project with request counts
router.get('/members-by-project', asyncHandler(async (_req, res) => {
  const data = await superAdminService.getMembersByProject();
  res.json(data);
}));

export default router;
