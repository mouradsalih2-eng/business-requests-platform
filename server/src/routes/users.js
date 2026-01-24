import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db/database.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = Router();

/**
 * Users API - Admin-only user management
 */

// Search users (authenticated, for @mentions)
router.get('/search', authenticateToken, (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length === 0) {
      return res.json([]);
    }

    const searchTerm = `%${q.trim()}%`;
    const users = db.all(`
      SELECT id, name, email
      FROM users
      WHERE name LIKE ? OR email LIKE ?
      ORDER BY name ASC
      LIMIT 10
    `, [searchTerm, searchTerm]);

    res.json(users);
  } catch (err) {
    console.error('Search users error:', err);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

// Get all users (admin only)
router.get('/', authenticateToken, requireAdmin, (req, res) => {
  try {
    const users = db.all(`
      SELECT
        u.id, u.email, u.name, u.role, u.created_at,
        (SELECT COUNT(*) FROM requests WHERE user_id = u.id) as request_count
      FROM users u
      ORDER BY u.created_at DESC
    `, []);

    res.json(users);
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Create new user (admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { email, password, name, role } = req.body;

    // Validate required fields
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    // Validate email format
    if (!email.endsWith('@company.com')) {
      return res.status(400).json({ error: 'Email must be a @company.com address' });
    }

    // Validate role
    const userRole = role || 'employee';
    if (!['employee', 'admin'].includes(userRole)) {
      return res.status(400).json({ error: 'Role must be "employee" or "admin"' });
    }

    // Check if user already exists
    const existingUser = db.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(400).json({ error: 'A user with this email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user
    db.run(
      'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)',
      [email, hashedPassword, name, userRole]
    );

    // Fetch the created user
    const newUser = db.get(
      'SELECT id, email, name, role, created_at FROM users WHERE email = ?',
      [email]
    );

    res.status(201).json(newUser);
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user role (admin only)
router.patch('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !['employee', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Role must be "employee" or "admin"' });
    }

    // Prevent changing own role
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }

    const user = db.get('SELECT id FROM users WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    db.run('UPDATE users SET role = ? WHERE id = ?', [role, id]);

    const updatedUser = db.get('SELECT id, email, name, role, created_at FROM users WHERE id = ?', [id]);
    res.json(updatedUser);
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user (admin only)
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;

    // Prevent deleting self
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const user = db.get('SELECT id FROM users WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    db.run('DELETE FROM users WHERE id = ?', [id]);

    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;
