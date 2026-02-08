import { projectRepository } from '../repositories/projectRepository.js';
import { projectMemberRepository } from '../repositories/projectMemberRepository.js';
import { ForbiddenError } from '../errors/AppError.js';

/**
 * Extract project_id from X-Project-Id header and attach to req.
 * Falls back to the default project when no header is sent.
 * Validates the project exists and user is a member (or super_admin).
 */
export async function requireProject(req, res, next) {
  let projectId = parseInt(req.headers['x-project-id'], 10);

  // Fall back to default project when no header is sent
  if (!projectId) {
    const defaultProject = await projectRepository.findBySlug('default');
    if (!defaultProject) {
      return res.status(400).json({ error: 'X-Project-Id header is required (no default project found)' });
    }
    projectId = defaultProject.id;
  }

  const project = await projectRepository.findById(projectId);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  // Super admins can access any project
  if (req.user.role === 'super_admin') {
    req.project = project;
    req.projectRole = 'admin';
    return next();
  }

  const membership = await projectMemberRepository.findByProjectAndUser(projectId, req.user.id);
  if (!membership) {
    return res.status(403).json({ error: 'You are not a member of this project' });
  }

  req.project = project;
  req.projectRole = membership.role;
  next();
}

/**
 * Require project admin role (or super_admin).
 * Must be used after authenticateToken and requireProject.
 */
export function requireProjectAdmin(req, res, next) {
  if (req.user.role === 'super_admin') return next();
  if (req.projectRole === 'admin') return next();
  throw new ForbiddenError('Project admin access required');
}

/**
 * Require super_admin global role.
 */
export function requireSuperAdmin(req, res, next) {
  if (req.user.role !== 'super_admin') {
    throw new ForbiddenError('Super admin access required');
  }
  next();
}
