import { Router } from 'express';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import db from '../db/database.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// Configure multer for avatar uploads
const avatarUploadDir = path.join(__dirname, '../../uploads/avatars');
if (!fs.existsSync(avatarUploadDir)) {
  fs.mkdirSync(avatarUploadDir, { recursive: true });
}

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, avatarUploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `user-${req.user.id}-${Date.now()}${ext}`);
  },
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
    }
  },
});

// ===== User Settings Endpoints =====

// Get current user settings
router.get('/me/settings', authenticateToken, (req, res) => {
  try {
    const user = db.get(
      'SELECT id, email, name, profile_picture, theme_preference FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (err) {
    console.error('Get settings error:', err);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

// Update user settings (theme preference)
router.patch('/me/settings', authenticateToken, (req, res) => {
  try {
    const { theme_preference } = req.body;

    // Validate theme preference
    if (theme_preference && !['light', 'dark', 'system'].includes(theme_preference)) {
      return res.status(400).json({ error: 'Invalid theme preference' });
    }

    if (theme_preference) {
      db.run('UPDATE users SET theme_preference = ? WHERE id = ?', [theme_preference, req.user.id]);
    }

    const user = db.get(
      'SELECT id, email, name, profile_picture, theme_preference FROM users WHERE id = ?',
      [req.user.id]
    );

    res.json(user);
  } catch (err) {
    console.error('Update settings error:', err);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Upload profile picture
router.post('/me/profile-picture', authenticateToken, avatarUpload.single('avatar'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Get old profile picture to delete
    const user = db.get('SELECT profile_picture FROM users WHERE id = ?', [req.user.id]);

    // Delete old profile picture if exists
    if (user?.profile_picture) {
      const oldPath = path.join(__dirname, '../..', user.profile_picture);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    // Save new profile picture path
    const profilePicturePath = `/uploads/avatars/${req.file.filename}`;
    db.run('UPDATE users SET profile_picture = ? WHERE id = ?', [profilePicturePath, req.user.id]);

    const updatedUser = db.get(
      'SELECT id, email, name, profile_picture, theme_preference FROM users WHERE id = ?',
      [req.user.id]
    );

    res.json(updatedUser);
  } catch (err) {
    console.error('Upload profile picture error:', err);
    res.status(500).json({ error: 'Failed to upload profile picture' });
  }
});

// Delete profile picture
router.delete('/me/profile-picture', authenticateToken, (req, res) => {
  try {
    const user = db.get('SELECT profile_picture FROM users WHERE id = ?', [req.user.id]);

    if (user?.profile_picture) {
      const picturePath = path.join(__dirname, '../..', user.profile_picture);
      if (fs.existsSync(picturePath)) {
        fs.unlinkSync(picturePath);
      }
    }

    db.run('UPDATE users SET profile_picture = NULL WHERE id = ?', [req.user.id]);

    res.json({ message: 'Profile picture deleted' });
  } catch (err) {
    console.error('Delete profile picture error:', err);
    res.status(500).json({ error: 'Failed to delete profile picture' });
  }
});

// Seed data for production
const seedUsers = [
  { email: 'sarah@company.com', name: 'Sarah Johnson', role: 'employee' },
  { email: 'mike@company.com', name: 'Mike Chen', role: 'employee' },
  { email: 'emily@company.com', name: 'Emily Davis', role: 'employee' },
  { email: 'james@company.com', name: 'James Wilson', role: 'employee' },
  { email: 'lisa@company.com', name: 'Lisa Park', role: 'employee' },
  { email: 'alex@company.com', name: 'Alex Rodriguez', role: 'employee' },
  { email: 'jessica@company.com', name: 'Jessica Lee', role: 'employee' },
  { email: 'david@company.com', name: 'David Kim', role: 'employee' },
  { email: 'rachel@company.com', name: 'Rachel Green', role: 'employee' },
  { email: 'tom@company.com', name: 'Tom Anderson', role: 'employee' },
];

const seedRequests = [
  { title: 'Mobile App Performance Issues on Android', category: 'bug', priority: 'high', status: 'in_progress', business_problem: 'The Android app is experiencing significant lag when loading the dashboard. Users report 5-10 second delays.', team: 'Manufacturing', region: 'EMEA' },
  { title: 'Add Dark Mode to Dashboard', category: 'new_feature', priority: 'medium', status: 'backlog', business_problem: 'Many users work late hours and have requested dark mode to reduce eye strain.', team: 'Sales', region: 'North America' },
  { title: 'Optimize Database Query Performance', category: 'optimization', priority: 'high', status: 'pending', business_problem: 'Report generation is taking over 30 seconds for large datasets.', team: 'Service', region: 'APAC' },
  { title: 'Export Data to Excel Feature', category: 'new_feature', priority: 'medium', status: 'completed', business_problem: 'Users currently have to manually copy data from tables to create Excel reports.', team: 'Energy', region: 'Global' },
  { title: 'Login Page Shows Error for Valid Credentials', category: 'bug', priority: 'high', status: 'pending', business_problem: 'Some users are unable to log in despite entering correct credentials.', team: 'Manufacturing', region: 'EMEA' },
  { title: 'Add Two-Factor Authentication', category: 'new_feature', priority: 'high', status: 'backlog', business_problem: 'Security-conscious enterprise clients require 2FA for compliance.', team: 'Sales', region: 'North America' },
  { title: 'Reduce Page Load Time on Dashboard', category: 'optimization', priority: 'medium', status: 'in_progress', business_problem: 'The main dashboard takes 4-5 seconds to fully load.', team: 'Service', region: 'APAC' },
  { title: 'Notification Center Not Showing All Alerts', category: 'bug', priority: 'medium', status: 'pending', business_problem: 'Users report missing notifications for important events.', team: 'Energy', region: 'Global' },
  { title: 'Add Bulk User Import via CSV', category: 'new_feature', priority: 'low', status: 'pending', business_problem: 'Onboarding large teams requires manually creating user accounts one by one.', team: 'Manufacturing', region: 'EMEA' },
  { title: 'Memory Leak in Real-time Updates', category: 'bug', priority: 'high', status: 'rejected', business_problem: 'Browser memory usage grows continuously when the dashboard is open.', team: 'Sales', region: 'North America' },
  { title: 'Improve Search Functionality', category: 'optimization', priority: 'medium', status: 'completed', business_problem: 'Current search only matches exact terms.', team: 'Service', region: 'APAC' },
  { title: 'Add Keyboard Shortcuts', category: 'new_feature', priority: 'low', status: 'duplicate', business_problem: 'Power users want keyboard navigation for faster workflows.', team: 'Energy', region: 'Global' },
  { title: 'API Rate Limiting for Third-party Integrations', category: 'new_feature', priority: 'medium', status: 'backlog', business_problem: 'Poorly implemented third-party integrations sometimes overwhelm our API.', team: 'Manufacturing', region: 'EMEA' },
  { title: 'Fix Timezone Display in Reports', category: 'bug', priority: 'low', status: 'completed', business_problem: 'Reports show times in UTC instead of user local timezone.', team: 'Sales', region: 'North America' },
  { title: 'Streamline Onboarding Flow', category: 'optimization', priority: 'medium', status: 'pending', business_problem: 'New users take an average of 15 minutes to complete onboarding.', team: 'Service', region: 'APAC' },
];

const requestTitles = [
  'Improve loading performance', 'Add new dashboard widget', 'Fix data sync issue', 'Implement export feature',
  'Update user interface', 'Optimize database queries', 'Add email notifications', 'Fix mobile layout',
  'Implement caching layer', 'Add dark mode support', 'Fix PDF generation', 'Improve search functionality',
  'Add bulk import feature', 'Fix authentication bug', 'Optimize API responses', 'Add keyboard shortcuts',
  'Fix timezone issues', 'Implement rate limiting', 'Add activity logging', 'Fix memory leak',
  'Improve error handling', 'Add multi-language support', 'Fix session timeout', 'Optimize image loading', 'Add custom reports',
];

const categories = ['bug', 'new_feature', 'optimization'];
const priorities = ['low', 'medium', 'high'];
const statuses = ['pending', 'backlog', 'in_progress', 'completed', 'rejected'];
const teams = ['Manufacturing', 'Sales', 'Service', 'Energy'];
const regions = ['EMEA', 'North America', 'APAC', 'Global'];
const comments = [
  'This is really affecting our daily workflow. Hope this gets prioritized!',
  'We have a workaround for now but would love a proper fix.',
  'Our team has been waiting for this feature for months.',
  'Great suggestion! This would save us so much time.',
  '+1 from our department. This is a pain point for us too.',
  'Is there an ETA on this? We need to plan around it.',
  'Thanks for raising this. We experience the same issue.',
  'Would be great to have this before Q2.',
];

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

    // Validate email format (basic validation)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
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

// Seed database with test data (admin only)
router.post('/seed', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

    // Create test users
    const hashedPassword = await bcrypt.hash('password123', 10);
    const userIds = [];

    for (const user of seedUsers) {
      const existing = db.get('SELECT id FROM users WHERE email = ?', [user.email]);
      if (!existing) {
        db.run('INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)',
          [user.email, hashedPassword, user.name, user.role]);
      }
      const u = db.get('SELECT id FROM users WHERE email = ?', [user.email]);
      userIds.push(u.id);
    }

    // Get admin user too
    const admin = db.get("SELECT id FROM users WHERE email = 'admin@company.com'");
    if (admin) userIds.push(admin.id);

    // Create 15 detailed requests
    const detailedRequestIds = [];
    for (let i = 0; i < seedRequests.length; i++) {
      const req = seedRequests[i];
      const existing = db.get('SELECT id FROM requests WHERE title = ?', [req.title]);
      if (!existing) {
        const daysAgo = randomInt(0, 30);
        const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
        db.run(`INSERT INTO requests (user_id, title, category, priority, status, business_problem, team, region, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [userIds[i % userIds.length], req.title, req.category, req.priority, req.status, req.business_problem, req.team, req.region, createdAt]);
      }
      const r = db.get('SELECT id FROM requests WHERE title = ?', [req.title]);
      if (r) detailedRequestIds.push(r.id);
    }

    // Create 100 additional requests with time distribution
    const now = new Date();
    const distributions = [
      { count: 10, minDays: 0, maxDays: 0 },
      { count: 20, minDays: 1, maxDays: 6 },
      { count: 30, minDays: 7, maxDays: 29 },
      { count: 25, minDays: 30, maxDays: 89 },
      { count: 15, minDays: 90, maxDays: 180 },
    ];

    let requestNum = 1;
    const allRequestIds = [...detailedRequestIds];

    for (const dist of distributions) {
      for (let i = 0; i < dist.count; i++) {
        const daysAgo = dist.minDays === dist.maxDays ? dist.minDays : randomInt(dist.minDays, dist.maxDays);
        const createdAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000 - randomInt(0, 23) * 60 * 60 * 1000).toISOString();
        const title = `${randomChoice(requestTitles)} - ${randomChoice(teams)} ${randomChoice(regions)} #${requestNum}`;

        const existing = db.get('SELECT id FROM requests WHERE title = ?', [title]);
        if (!existing) {
          db.run(`INSERT INTO requests (user_id, title, category, priority, status, team, region, business_problem, created_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [randomChoice(userIds), title, randomChoice(categories), randomChoice(priorities), randomChoice(statuses),
             randomChoice(teams), randomChoice(regions), `This is a request for ${randomChoice(teams)} team in ${randomChoice(regions)}.`, createdAt]);
          const r = db.get('SELECT id FROM requests WHERE title = ?', [title]);
          if (r) allRequestIds.push(r.id);
        }
        requestNum++;
      }
    }

    // Add votes, comments, and tags to requests
    for (const requestId of allRequestIds) {
      const shuffledUsers = [...userIds].sort(() => Math.random() - 0.5);

      // Add upvotes (0-8)
      const upvoteCount = randomInt(0, 8);
      for (let i = 0; i < upvoteCount && i < shuffledUsers.length; i++) {
        const existing = db.get('SELECT id FROM votes WHERE request_id = ? AND user_id = ? AND type = ?', [requestId, shuffledUsers[i], 'upvote']);
        if (!existing) {
          db.run('INSERT INTO votes (request_id, user_id, type) VALUES (?, ?, ?)', [requestId, shuffledUsers[i], 'upvote']);
        }
      }

      // Add likes (0-5)
      const likeCount = randomInt(0, 5);
      for (let i = 0; i < likeCount && i < shuffledUsers.length; i++) {
        const existing = db.get('SELECT id FROM votes WHERE request_id = ? AND user_id = ? AND type = ?', [requestId, shuffledUsers[i], 'like']);
        if (!existing) {
          db.run('INSERT INTO votes (request_id, user_id, type) VALUES (?, ?, ?)', [requestId, shuffledUsers[i], 'like']);
        }
      }

      // Add comments (0-3)
      const commentCount = randomInt(0, 3);
      for (let i = 0; i < commentCount; i++) {
        db.run('INSERT INTO comments (request_id, user_id, content) VALUES (?, ?, ?)',
          [requestId, shuffledUsers[i % shuffledUsers.length], randomChoice(comments)]);
      }

      // Add tags (0-3)
      const tagOptions = ['urgent', 'quick-win', 'customer-request', 'technical-debt', 'security', 'ux', 'performance', 'integration'];
      const tagCount = randomInt(0, 3);
      const selectedTags = [...tagOptions].sort(() => Math.random() - 0.5).slice(0, tagCount);
      for (const tag of selectedTags) {
        const existing = db.get('SELECT id FROM request_tags WHERE request_id = ? AND tag = ?', [requestId, tag]);
        if (!existing) {
          db.run('INSERT INTO request_tags (request_id, tag) VALUES (?, ?)', [requestId, tag]);
        }
      }
    }

    // Get counts
    const totalUsers = db.get('SELECT COUNT(*) as count FROM users').count;
    const totalRequests = db.get('SELECT COUNT(*) as count FROM requests').count;
    const totalVotes = db.get('SELECT COUNT(*) as count FROM votes').count;
    const totalComments = db.get('SELECT COUNT(*) as count FROM comments').count;

    res.json({
      message: 'Database seeded successfully',
      users: totalUsers,
      requests: totalRequests,
      votes: totalVotes,
      comments: totalComments,
    });
  } catch (err) {
    console.error('Seed error:', err);
    res.status(500).json({ error: 'Failed to seed database: ' + err.message });
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
