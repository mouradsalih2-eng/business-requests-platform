import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requireProject, requireProjectAdmin, requireSuperAdmin } from '../middleware/project.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { projectRepository } from '../repositories/projectRepository.js';
import { projectMemberRepository } from '../repositories/projectMemberRepository.js';
import { userRepository } from '../repositories/userRepository.js';
import { ValidationError, NotFoundError } from '../errors/AppError.js';

const router = Router();

// List projects the user belongs to (or all projects for super_admin)
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  if (req.user.role === 'super_admin') {
    const projects = await projectRepository.findAll();
    res.json(projects);
  } else {
    const projects = await projectRepository.findByUser(req.user.id);
    res.json(projects);
  }
}));

// Get a single project
router.get('/:id', authenticateToken, requireProject, asyncHandler(async (req, res) => {
  const stats = await projectRepository.getStats(req.project.id);
  res.json({ ...req.project, stats });
}));

// Create project (admin or super_admin)
router.post('/', authenticateToken, asyncHandler(async (req, res) => {
  if (req.user.role !== 'super_admin' && req.user.role !== 'admin') {
    throw new ValidationError('Only admins can create projects');
  }

  const { name, slug, description, icon, logo_url } = req.body;
  if (!name?.trim()) throw new ValidationError('Project name is required');
  if (!slug?.trim()) throw new ValidationError('Project slug is required');

  // Validate slug format
  if (!/^[a-z0-9-]+$/.test(slug)) {
    throw new ValidationError('Slug must contain only lowercase letters, numbers, and hyphens');
  }

  const project = await projectRepository.create({
    name: name.trim(),
    slug: slug.trim().toLowerCase(),
    description: description?.trim() || null,
    icon: icon || null,
    logo_url: logo_url || null,
    created_by: req.user.id,
  });

  // Add creator as project admin
  await projectMemberRepository.addMember(project.id, req.user.id, 'admin');

  res.status(201).json(project);
}));

// Update project (project admin or super_admin)
router.patch('/:id', authenticateToken, requireProject, requireProjectAdmin, asyncHandler(async (req, res) => {
  const { name, description, icon, logo_url } = req.body;
  const updates = {};
  if (name !== undefined) updates.name = name.trim();
  if (description !== undefined) updates.description = description?.trim() || null;
  if (icon !== undefined) updates.icon = icon;
  if (logo_url !== undefined) updates.logo_url = logo_url;

  if (!Object.keys(updates).length) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  const project = await projectRepository.update(req.project.id, updates);
  res.json(project);
}));

// Delete project (super_admin only, cannot delete default)
router.delete('/:id', authenticateToken, requireSuperAdmin, asyncHandler(async (req, res) => {
  const project = await projectRepository.findByIdOrFail(parseInt(req.params.id, 10));
  if (project.slug === 'default') {
    throw new ValidationError('Cannot delete the default project');
  }
  await projectRepository.delete(project.id);
  res.json({ message: 'Project deleted' });
}));

// ── Project Members ─────────────────────────────────────────

// List members
router.get('/:id/members', authenticateToken, requireProject, asyncHandler(async (req, res) => {
  const members = await projectMemberRepository.findByProject(req.project.id);
  res.json(members);
}));

// Add member (project admin or super_admin)
router.post('/:id/members', authenticateToken, requireProject, requireProjectAdmin, asyncHandler(async (req, res) => {
  const { user_id, role = 'member' } = req.body;
  if (!user_id) throw new ValidationError('user_id is required');

  const user = await userRepository.findById(parseInt(user_id, 10));
  if (!user) throw new NotFoundError('User');

  if (!['member', 'admin'].includes(role)) {
    throw new ValidationError('Role must be "member" or "admin"');
  }

  const member = await projectMemberRepository.addMember(req.project.id, user.id, role);
  res.status(201).json(member);
}));

// Update member role
router.patch('/:id/members/:userId', authenticateToken, requireProject, requireProjectAdmin, asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (!['member', 'admin'].includes(role)) {
    throw new ValidationError('Role must be "member" or "admin"');
  }

  const userId = parseInt(req.params.userId, 10);
  const existing = await projectMemberRepository.findByProjectAndUser(req.project.id, userId);
  if (!existing) throw new NotFoundError('Project member');

  const member = await projectMemberRepository.updateRole(req.project.id, userId, role);
  res.json(member);
}));

// Remove member
router.delete('/:id/members/:userId', authenticateToken, requireProject, requireProjectAdmin, asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.userId, 10);
  const existing = await projectMemberRepository.findByProjectAndUser(req.project.id, userId);
  if (!existing) throw new NotFoundError('Project member');

  await projectMemberRepository.removeMember(req.project.id, userId);
  res.json({ message: 'Member removed' });
}));

export default router;
