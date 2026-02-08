import { Router } from 'express';
import multer from 'multer';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { requireSuperAdmin } from '../middleware/project.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { supabase } from '../db/supabase.js';
import { userRepository } from '../repositories/userRepository.js';
import { projectMemberRepository } from '../repositories/projectMemberRepository.js';
import { storageService } from '../services/storageService.js';
import { seedDatabase, unseedDatabase } from '../services/seedService.js';
import { ValidationError, ForbiddenError, ConflictError, AppError } from '../errors/AppError.js';

const router = Router();

// ── Avatar upload config (memory storage — file goes to Supabase) ──

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype));
  },
});

// ── Settings routes (before :id) ─────────────────────────────

router.get('/me/settings', authenticateToken, asyncHandler(async (req, res) => {
  const user = await userRepository.findByIdOrFail(req.user.id, 'id, email, name, profile_picture, theme_preference');
  res.json(user);
}));

router.patch('/me/settings', authenticateToken, asyncHandler(async (req, res) => {
  const { theme_preference } = req.body;
  if (theme_preference && !['light', 'dark', 'system'].includes(theme_preference)) {
    throw new ValidationError('Invalid theme preference');
  }
  const user = theme_preference
    ? await userRepository.updateTheme(req.user.id, theme_preference)
    : await userRepository.findById(req.user.id, 'id, email, name, profile_picture, theme_preference');
  res.json(user);
}));

router.post('/me/profile-picture', authenticateToken, avatarUpload.single('avatar'), asyncHandler(async (req, res) => {
  if (!req.file) throw new ValidationError('No file uploaded');

  // Delete old avatar from Supabase Storage
  const current = await userRepository.findById(req.user.id, 'profile_picture');
  if (current?.profile_picture) {
    await storageService.deleteAvatar(current.profile_picture);
  }

  // Upload new avatar to Supabase Storage
  const publicUrl = await storageService.uploadAvatar(
    req.user.id, req.file.buffer, req.file.originalname, req.file.mimetype
  );

  const user = await userRepository.updateProfilePicture(req.user.id, publicUrl);
  res.json(user);
}));

router.delete('/me/profile-picture', authenticateToken, asyncHandler(async (req, res) => {
  const current = await userRepository.findById(req.user.id, 'profile_picture');
  if (current?.profile_picture) {
    await storageService.deleteAvatar(current.profile_picture);
  }
  await userRepository.updateProfilePicture(req.user.id, null);
  res.json({ message: 'Profile picture deleted' });
}));

// ── User search (for @mentions) ──────────────────────────────

router.get('/search', authenticateToken, asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q?.trim()) return res.json([]);
  const users = await userRepository.search(q.trim());
  res.json(users);
}));

// ── Admin routes ─────────────────────────────────────────────

router.get('/', authenticateToken, requireAdmin, asyncHandler(async (_req, res) => {
  const users = await userRepository.findAllWithRequestCount();
  res.json(users);
}));

// Admin creates a user — also creates Supabase Auth account
router.post('/', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { email, password, name, role } = req.body;
  if (!email || !password || !name) throw new ValidationError('Email, password, and name are required');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ValidationError('Please enter a valid email address');

  const userRole = role || 'employee';
  if (!['employee', 'admin'].includes(userRole)) throw new ValidationError('Role must be "employee" or "admin"');

  const existing = await userRepository.findByEmail(email, 'id');
  if (existing) throw new ConflictError('A user with this email already exists');

  // Create Supabase Auth user (confirmed — admin is creating them)
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, role: userRole },
  });
  if (authError) throw new AppError(`Failed to create auth account: ${authError.message}`, 500);

  // Create our app user linked to Supabase Auth (must_change_password for email/password users)
  const user = await userRepository.create({
    email,
    name,
    role: userRole,
    auth_id: authData.user.id,
    must_change_password: true,
  });
  res.status(201).json(user);
}));

// ── Invite user (Google SSO or Email+Password) ──────────────

router.post('/invite', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { email, name, role, auth_method, password, project_id } = req.body;

  if (!email || !name) throw new ValidationError('Email and name are required');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ValidationError('Please enter a valid email address');

  const userRole = role || 'employee';
  if (!['employee', 'admin'].includes(userRole)) throw new ValidationError('Role must be "employee" or "admin"');

  if (!auth_method || !['google', 'email'].includes(auth_method)) {
    throw new ValidationError('auth_method must be "google" or "email"');
  }

  const existing = await userRepository.findByEmail(email, 'id');
  if (existing) throw new ConflictError('A user with this email already exists');

  let user;

  if (auth_method === 'google') {
    // Create app user only — no Supabase Auth account
    // auth_id will be linked when the user signs in with Google OAuth
    user = await userRepository.create({
      email,
      name,
      role: userRole,
      auth_provider: 'google',
      must_change_password: false,
    });
  } else {
    // Email + password method
    if (!password || password.length < 6) {
      throw new ValidationError('Password must be at least 6 characters');
    }

    // Create Supabase Auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role: userRole },
    });
    if (authError) throw new AppError(`Failed to create auth account: ${authError.message}`, 500);

    user = await userRepository.create({
      email,
      name,
      role: userRole,
      auth_id: authData.user.id,
      must_change_password: true,
    });
  }

  // Add to project if specified
  if (project_id) {
    const memberRole = userRole === 'admin' ? 'admin' : 'member';
    await projectMemberRepository.addMember(project_id, user.id, memberRole);
  }

  res.status(201).json(user);
}));

// ── List admins (super_admin only) ──────────────────────────

router.get('/admins', authenticateToken, requireSuperAdmin, asyncHandler(async (_req, res) => {
  const admins = await userRepository.findAdmins();
  res.json(admins);
}));

router.patch('/:id', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!role || !['employee', 'admin'].includes(role)) throw new ValidationError('Role must be "employee" or "admin"');
  if (parseInt(id) === req.user.id) throw new ForbiddenError('Cannot change your own role');

  await userRepository.findByIdOrFail(id);
  const user = await userRepository.updateRole(id, role);
  res.json(user);
}));

// Admin deletes a user — also removes Supabase Auth account
router.delete('/:id', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (parseInt(id) === req.user.id) throw new ForbiddenError('Cannot delete your own account');

  const user = await userRepository.findByIdOrFail(id, 'id, auth_id');

  // Delete Supabase Auth user if linked
  if (user.auth_id) {
    await supabase.auth.admin.deleteUser(user.auth_id).catch(() => {});
  }

  await userRepository.delete(id);
  res.json({ message: 'User deleted successfully' });
}));

// ── Seed ─────────────────────────────────────────────────────

router.post('/seed', authenticateToken, requireAdmin, asyncHandler(async (_req, res) => {
  const result = await seedDatabase();
  res.json(result);
}));

router.delete('/seed', authenticateToken, requireAdmin, asyncHandler(async (_req, res) => {
  const result = await unseedDatabase();
  res.json(result);
}));

export default router;
