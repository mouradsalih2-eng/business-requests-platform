import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// ── Constants ────────────────────────────────────────────────
const JWT_SECRET = 'test-secret';

// ── Mock repositories and services ──────────────────────────

const mockUserRepository = {
  findById: jest.fn(),
  findByIdOrFail: jest.fn(),
  findByEmail: jest.fn(),
  findAll: jest.fn(),
  findAllWithRequestCount: jest.fn(),
  search: jest.fn(),
  create: jest.fn(),
  updateRole: jest.fn(),
  updatePassword: jest.fn(),
  updateTheme: jest.fn(),
  updateProfilePicture: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
  updateAuthId: jest.fn(),
  findAdmins: jest.fn(),
};

const mockProjectMemberRepository = {
  addMember: jest.fn(),
  removeMember: jest.fn(),
  findByProjectAndUser: jest.fn(),
  findByProject: jest.fn(),
  updateRole: jest.fn(),
};

const mockSeedDatabase = jest.fn();
const mockUnseedDatabase = jest.fn();

jest.unstable_mockModule('../src/repositories/userRepository.js', () => ({
  userRepository: mockUserRepository,
}));

jest.unstable_mockModule('../src/repositories/projectMemberRepository.js', () => ({
  projectMemberRepository: mockProjectMemberRepository,
}));

jest.unstable_mockModule('../src/services/seedService.js', () => ({
  seedDatabase: mockSeedDatabase,
  unseedDatabase: mockUnseedDatabase,
}));

jest.unstable_mockModule('bcryptjs', () => ({
  default: {
    hash: jest.fn().mockResolvedValue('hashed_password'),
    compare: jest.fn(),
    compareSync: jest.fn(),
  },
}));

jest.unstable_mockModule('../src/db/supabase.js', () => ({
  supabase: {
    auth: {
      admin: {
        createUser: jest.fn().mockResolvedValue({ data: { user: { id: 'mock-uuid' } }, error: null }),
        updateUserById: jest.fn().mockResolvedValue({ error: null }),
        deleteUser: jest.fn().mockResolvedValue({ error: null }),
      },
    },
  },
  supabaseAnon: null,
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
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') return res.status(403).json({ error: 'Admin access required' });
    next();
  },
}));

jest.unstable_mockModule('../src/middleware/project.js', () => ({
  requireSuperAdmin: (req, res, next) => {
    if (req.user?.role !== 'super_admin') return res.status(403).json({ error: 'Super admin access required' });
    next();
  },
  requireProject: (req, res, next) => next(),
  requireProjectAdmin: (req, res, next) => next(),
}));

// Mock storageService (files are now in Supabase Storage, no local fs)
jest.unstable_mockModule('../src/services/storageService.js', () => ({
  storageService: {
    uploadAvatar: jest.fn(),
    deleteAvatar: jest.fn(),
    uploadAttachment: jest.fn(),
    deleteAttachments: jest.fn(),
  },
}));

// ── Import route and error infrastructure AFTER mocks ────────

const { default: usersRoutes } = await import('../src/routes/users.js');
const { errorHandler } = await import('../src/middleware/errorHandler.js');

// ── Create test Express app ──────────────────────────────────

const app = express();
app.use(express.json());
app.use('/api/users', usersRoutes);
app.use(errorHandler);

// ── Helpers ──────────────────────────────────────────────────

const generateToken = (payload) => jwt.sign(payload, JWT_SECRET);

const employeeToken = generateToken({ id: 1, email: 'employee@example.com', role: 'employee' });
const adminToken = generateToken({ id: 2, email: 'admin@example.com', role: 'admin' });
const superAdminToken = generateToken({ id: 3, email: 'super@example.com', role: 'super_admin' });

// ── Tests ────────────────────────────────────────────────────

describe('Users API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── GET /api/users/search ──────────────────────────────────

  describe('GET /api/users/search', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app).get('/api/users/search?q=john');
      expect(res.status).toBe(401);
    });

    it('returns empty array when query is empty', async () => {
      const res = await request(app)
        .get('/api/users/search?q=')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
      expect(mockUserRepository.search).not.toHaveBeenCalled();
    });

    it('returns empty array when query is missing', async () => {
      const res = await request(app)
        .get('/api/users/search')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('returns empty array when query is only whitespace', async () => {
      const res = await request(app)
        .get('/api/users/search?q=%20%20')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('returns matching users by name', async () => {
      mockUserRepository.search.mockResolvedValue([
        { id: 10, name: 'John Doe', email: 'john@example.com' },
        { id: 11, name: 'Johnny Smith', email: 'johnny@example.com' },
      ]);

      const res = await request(app)
        .get('/api/users/search?q=john')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].name).toBe('John Doe');
      expect(mockUserRepository.search).toHaveBeenCalledWith('john');
    });

    it('returns matching users by email', async () => {
      mockUserRepository.search.mockResolvedValue([
        { id: 10, name: 'Test User', email: 'test@company.com' },
      ]);

      const res = await request(app)
        .get('/api/users/search?q=company')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].email).toBe('test@company.com');
    });

    it('trims the query before searching', async () => {
      mockUserRepository.search.mockResolvedValue([]);

      await request(app)
        .get('/api/users/search?q=%20john%20')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(mockUserRepository.search).toHaveBeenCalledWith('john');
    });
  });

  // ── GET /api/users (admin list all) ────────────────────────

  describe('GET /api/users', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app).get('/api/users');
      expect(res.status).toBe(401);
    });

    it('returns 403 for non-admin users', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Admin');
    });

    it('returns all users with request counts for admin', async () => {
      mockUserRepository.findAllWithRequestCount.mockResolvedValue([
        { id: 1, email: 'user1@test.com', name: 'User 1', role: 'employee', created_at: '2024-01-01', request_count: 5 },
        { id: 2, email: 'admin@test.com', name: 'Admin', role: 'admin', created_at: '2024-01-01', request_count: 3 },
      ]);

      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].request_count).toBe(5);
      expect(res.body[1].request_count).toBe(3);
      expect(mockUserRepository.findAllWithRequestCount).toHaveBeenCalled();
    });

    it('returns empty array when no users exist', async () => {
      mockUserRepository.findAllWithRequestCount.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  // ── POST /api/users (admin create user) ────────────────────

  describe('POST /api/users', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app)
        .post('/api/users')
        .send({ email: 'new@test.com', password: 'pass123', name: 'New User' });
      expect(res.status).toBe(401);
    });

    it('returns 403 for non-admin users', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ email: 'new@test.com', password: 'pass123', name: 'New User' });

      expect(res.status).toBe(403);
    });

    it('returns 400 if email is missing', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ password: 'pass123', name: 'New User' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('required');
    });

    it('returns 400 if password is missing', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'new@test.com', name: 'New User' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('required');
    });

    it('returns 400 if name is missing', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'new@test.com', password: 'pass123' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('required');
    });

    it('returns 400 for invalid email format', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'not-an-email', password: 'pass123', name: 'New User' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('valid email');
    });

    it('returns 400 for invalid role', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'new@test.com', password: 'pass123', name: 'New User', role: 'superuser' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Role');
    });

    it('returns 409 if email already exists', async () => {
      mockUserRepository.findByEmail.mockResolvedValue({ id: 99 });

      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'existing@test.com', password: 'pass123', name: 'Existing User' });

      expect(res.status).toBe(409);
      expect(res.body.error).toContain('already exists');
    });

    it('creates user with default employee role', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue({
        id: 10, email: 'new@test.com', name: 'New User', role: 'employee', created_at: '2024-01-01',
      });

      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'new@test.com', password: 'pass123', name: 'New User' });

      expect(res.status).toBe(201);
      expect(res.body.email).toBe('new@test.com');
      expect(res.body.role).toBe('employee');
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        email: 'new@test.com',
        name: 'New User',
        role: 'employee',
        auth_id: 'mock-uuid',
        must_change_password: true,
      });
    });

    it('creates user with explicit admin role', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue({
        id: 11, email: 'newadmin@test.com', name: 'New Admin', role: 'admin', created_at: '2024-01-01',
      });

      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'newadmin@test.com', password: 'pass123', name: 'New Admin', role: 'admin' });

      expect(res.status).toBe(201);
      expect(res.body.role).toBe('admin');
    });

    it('creates Supabase Auth account before app user', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue({
        id: 12, email: 'new@test.com', name: 'New', role: 'employee', created_at: '2024-01-01',
      });

      const { supabase: mockSupabase } = await import('../src/db/supabase.js');

      await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'new@test.com', password: 'plaintext', name: 'New' });

      expect(mockSupabase.auth.admin.createUser).toHaveBeenCalledWith({
        email: 'new@test.com',
        password: 'plaintext',
        email_confirm: true,
        user_metadata: { name: 'New', role: 'employee' },
      });
      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ auth_id: 'mock-uuid' })
      );
    });
  });

  // ── PATCH /api/users/:id (admin update role) ───────────────

  describe('PATCH /api/users/:id', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app)
        .patch('/api/users/5')
        .send({ role: 'admin' });
      expect(res.status).toBe(401);
    });

    it('returns 403 for non-admin users', async () => {
      const res = await request(app)
        .patch('/api/users/5')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ role: 'admin' });

      expect(res.status).toBe(403);
    });

    it('returns 400 for missing role', async () => {
      const res = await request(app)
        .patch('/api/users/5')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Role');
    });

    it('returns 400 for invalid role value', async () => {
      const res = await request(app)
        .patch('/api/users/5')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'superadmin' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Role');
    });

    it('returns 403 when admin tries to change own role (prevents self-change)', async () => {
      const res = await request(app)
        .patch('/api/users/2') // admin's own ID
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'employee' });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('own role');
    });

    it('returns 404 if target user not found', async () => {
      mockUserRepository.findByIdOrFail.mockRejectedValue(
        (() => { const e = new Error('User not found'); e.statusCode = 404; e.isOperational = true; return e; })()
      );

      // Use the actual NotFoundError
      const { NotFoundError } = await import('../src/errors/AppError.js');
      mockUserRepository.findByIdOrFail.mockRejectedValue(new NotFoundError('User'));

      const res = await request(app)
        .patch('/api/users/999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'admin' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('User not found');
    });

    it('updates user role successfully', async () => {
      mockUserRepository.findByIdOrFail.mockResolvedValue({ id: 5, email: 'user@test.com', role: 'employee' });
      mockUserRepository.updateRole.mockResolvedValue({
        id: 5, email: 'user@test.com', name: 'Test User', role: 'admin', created_at: '2024-01-01',
      });

      const res = await request(app)
        .patch('/api/users/5')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'admin' });

      expect(res.status).toBe(200);
      expect(res.body.role).toBe('admin');
      expect(mockUserRepository.updateRole).toHaveBeenCalledWith('5', 'admin');
    });
  });

  // ── DELETE /api/users/:id (admin delete user) ──────────────

  describe('DELETE /api/users/:id', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app).delete('/api/users/5');
      expect(res.status).toBe(401);
    });

    it('returns 403 for non-admin users', async () => {
      const res = await request(app)
        .delete('/api/users/5')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(403);
    });

    it('returns 403 when admin tries to delete own account (prevents self-delete)', async () => {
      const res = await request(app)
        .delete('/api/users/2') // admin's own ID
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('own account');
    });

    it('returns 404 if target user not found', async () => {
      const { NotFoundError } = await import('../src/errors/AppError.js');
      mockUserRepository.findByIdOrFail.mockRejectedValue(new NotFoundError('User'));

      const res = await request(app)
        .delete('/api/users/999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('User not found');
    });

    it('deletes user successfully', async () => {
      mockUserRepository.findByIdOrFail.mockResolvedValue({ id: 5, email: 'todelete@test.com' });
      mockUserRepository.delete.mockResolvedValue();

      const res = await request(app)
        .delete('/api/users/5')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('deleted');
      expect(mockUserRepository.delete).toHaveBeenCalledWith('5');
    });
  });

  // ── POST /api/users/invite (invite user) ───────────────────

  describe('POST /api/users/invite', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app)
        .post('/api/users/invite')
        .send({ email: 'new@test.com', name: 'New', auth_method: 'email', password: 'pass123' });
      expect(res.status).toBe(401);
    });

    it('returns 403 for non-admin users', async () => {
      const res = await request(app)
        .post('/api/users/invite')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ email: 'new@test.com', name: 'New', auth_method: 'email', password: 'pass123' });
      expect(res.status).toBe(403);
    });

    it('returns 400 if email is missing', async () => {
      const res = await request(app)
        .post('/api/users/invite')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'New', auth_method: 'email', password: 'pass123' });
      expect(res.status).toBe(400);
    });

    it('returns 400 for invalid auth_method', async () => {
      const res = await request(app)
        .post('/api/users/invite')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'new@test.com', name: 'New', auth_method: 'invalid' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('auth_method');
    });

    it('creates Google SSO user without Supabase Auth', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue({
        id: 20, email: 'google@test.com', name: 'Google User', role: 'employee', created_at: '2024-01-01',
      });

      const res = await request(app)
        .post('/api/users/invite')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'google@test.com', name: 'Google User', auth_method: 'google' });

      expect(res.status).toBe(201);
      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'google@test.com',
          auth_provider: 'google',
          must_change_password: false,
        })
      );
    });

    it('creates email user with Supabase Auth and must_change_password', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue({
        id: 21, email: 'email@test.com', name: 'Email User', role: 'employee', created_at: '2024-01-01',
      });

      const res = await request(app)
        .post('/api/users/invite')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'email@test.com', name: 'Email User', auth_method: 'email', password: 'pass123' });

      expect(res.status).toBe(201);
      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'email@test.com',
          must_change_password: true,
          auth_id: 'mock-uuid',
        })
      );
    });

    it('returns 400 when email auth_method without password', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/users/invite')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'email@test.com', name: 'Email User', auth_method: 'email' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Password');
    });

    it('adds user to project when project_id provided', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue({
        id: 22, email: 'proj@test.com', name: 'Proj User', role: 'employee', created_at: '2024-01-01',
      });
      mockProjectMemberRepository.addMember.mockResolvedValue();

      const res = await request(app)
        .post('/api/users/invite')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'proj@test.com', name: 'Proj User', auth_method: 'google', project_id: 5 });

      expect(res.status).toBe(201);
      expect(mockProjectMemberRepository.addMember).toHaveBeenCalledWith(5, 22, 'member');
    });

    it('returns 409 if email already exists', async () => {
      mockUserRepository.findByEmail.mockResolvedValue({ id: 99 });

      const res = await request(app)
        .post('/api/users/invite')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'existing@test.com', name: 'Existing', auth_method: 'google' });

      expect(res.status).toBe(409);
    });
  });

  // ── GET /api/users/admins (super_admin only) ──────────────

  describe('GET /api/users/admins', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app).get('/api/users/admins');
      expect(res.status).toBe(401);
    });

    it('returns 403 for non-super-admin', async () => {
      const res = await request(app)
        .get('/api/users/admins')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(403);
    });

    it('returns admins list for super_admin', async () => {
      mockUserRepository.findAdmins.mockResolvedValue([
        { id: 2, email: 'admin@test.com', name: 'Admin', role: 'admin', created_at: '2024-01-01' },
        { id: 3, email: 'super@test.com', name: 'Super', role: 'super_admin', created_at: '2024-01-01' },
      ]);

      const res = await request(app)
        .get('/api/users/admins')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(mockUserRepository.findAdmins).toHaveBeenCalled();
    });
  });

  // ── POST /api/users/seed (admin seed database) ────────────

  describe('POST /api/users/seed', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app).post('/api/users/seed');
      expect(res.status).toBe(401);
    });

    it('returns 403 for non-admin users', async () => {
      const res = await request(app)
        .post('/api/users/seed')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(403);
    });

    it('seeds database successfully for admin', async () => {
      mockSeedDatabase.mockResolvedValue({
        message: 'Database seeded successfully',
        users: 12,
        requests: 115,
        votes: 340,
        comments: 120,
      });

      const res = await request(app)
        .post('/api/users/seed')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('seeded');
      expect(res.body.users).toBe(12);
      expect(res.body.requests).toBe(115);
      expect(res.body.votes).toBe(340);
      expect(res.body.comments).toBe(120);
      expect(mockSeedDatabase).toHaveBeenCalledTimes(1);
    });

    it('propagates errors from seedDatabase', async () => {
      mockSeedDatabase.mockRejectedValue(new Error('Seed failed'));

      const res = await request(app)
        .post('/api/users/seed')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(500);
    });
  });
});
