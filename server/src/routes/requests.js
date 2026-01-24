import { Router } from 'express';
import multer from 'multer';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import db from '../db/database.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = Router();

/**
 * Requests API - CRUD operations for business requests
 * All authenticated users can view all requests
 */

// Allowed file types for uploads
const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
];

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.csv'];

// Configure multer for file uploads with validation
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    // Sanitize filename - remove path traversal and special characters
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + sanitizedName);
  }
});

const fileFilter = (req, file, cb) => {
  const ext = '.' + file.originalname.split('.').pop().toLowerCase();

  if (ALLOWED_FILE_TYPES.includes(file.mimetype) && ALLOWED_EXTENSIONS.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Allowed: images, PDF, Word, Excel, and text files.'), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter
});

// Get analytics data (admin only) - MUST be before /:id routes
router.get('/stats/analytics', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { period } = req.query; // '7days', '30days', '90days', 'all'
    const now = new Date();

    let days;
    let groupBy;

    switch (period) {
      case '7days':
        days = 7;
        groupBy = 'day';
        break;
      case '30days':
        days = 30;
        groupBy = 'week';
        break;
      case '90days':
        days = 90;
        groupBy = 'month';
        break;
      case 'all':
      default:
        days = 365 * 10; // 10 years back
        groupBy = 'month';
        break;
    }

    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // Get all requests within the period
    const requests = db.all(
      `SELECT id, created_at, status, category, priority, team, region
       FROM requests
       WHERE created_at >= ?
       ORDER BY created_at ASC`,
      [startDate.toISOString()]
    );

    // Group requests by time period
    const grouped = {};

    requests.forEach(r => {
      const date = new Date(r.created_at);
      let key;

      if (groupBy === 'day') {
        key = date.toISOString().split('T')[0]; // YYYY-MM-DD
      } else if (groupBy === 'week') {
        // Get the start of the week (Monday)
        const tempDate = new Date(date);
        const dayOfWeek = tempDate.getDay();
        const diff = tempDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const weekStart = new Date(tempDate.setDate(diff));
        key = `Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      } else {
        key = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      }

      if (!grouped[key]) {
        grouped[key] = { label: key, count: 0, pending: 0, completed: 0 };
      }
      grouped[key].count++;
      if (r.status === 'pending') grouped[key].pending++;
      if (r.status === 'completed') grouped[key].completed++;
    });

    // Convert to array and sort
    let data = Object.values(grouped);

    // For 7 days, fill in missing days
    if (groupBy === 'day') {
      const filledData = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const key = date.toISOString().split('T')[0];
        const existing = grouped[key];
        filledData.push(existing || { label: key, count: 0, pending: 0, completed: 0 });
      }
      data = filledData;
    }

    // Get summary stats
    const totalRequests = requests.length;
    const pendingCount = requests.filter(r => r.status === 'pending').length;
    const completedCount = requests.filter(r => r.status === 'completed').length;
    const inProgressCount = requests.filter(r => r.status === 'in_progress').length;

    // Category breakdown
    const categoryBreakdown = {
      bug: requests.filter(r => r.category === 'bug').length,
      new_feature: requests.filter(r => r.category === 'new_feature').length,
      optimization: requests.filter(r => r.category === 'optimization').length
    };

    // Priority breakdown
    const priorityBreakdown = {
      high: requests.filter(r => r.priority === 'high').length,
      medium: requests.filter(r => r.priority === 'medium').length,
      low: requests.filter(r => r.priority === 'low').length
    };

    // Team breakdown
    const teamBreakdown = {
      Manufacturing: requests.filter(r => r.team === 'Manufacturing').length,
      Sales: requests.filter(r => r.team === 'Sales').length,
      Service: requests.filter(r => r.team === 'Service').length,
      Energy: requests.filter(r => r.team === 'Energy').length
    };

    // Region breakdown
    const regionBreakdown = {
      EMEA: requests.filter(r => r.region === 'EMEA').length,
      'North America': requests.filter(r => r.region === 'North America').length,
      APAC: requests.filter(r => r.region === 'APAC').length,
      Global: requests.filter(r => r.region === 'Global').length
    };

    res.json({
      trendData: data,
      summary: {
        total: totalRequests,
        pending: pendingCount,
        completed: completedCount,
        inProgress: inProgressCount
      },
      categoryBreakdown,
      priorityBreakdown,
      teamBreakdown,
      regionBreakdown
    });
  } catch (err) {
    console.error('Get analytics error:', err);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

// Search requests (autocomplete) - MUST be before /:id routes
router.get('/search', authenticateToken, (req, res) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q || q.length < 2) {
      return res.json([]);
    }

    const searchTerm = q.toLowerCase();
    const limitNum = Math.min(parseInt(limit) || 10, 20);

    // Get all requests with author info
    const requests = db.all(`
      SELECT
        r.id, r.title, r.status, r.category,
        u.name as author_name
      FROM requests r
      JOIN users u ON r.user_id = u.id
    `);

    // Score and filter results
    const scored = requests
      .map(r => {
        const titleLower = r.title.toLowerCase();
        const authorLower = r.author_name.toLowerCase();
        let score = 0;

        // Exact title match
        if (titleLower === searchTerm) score = 100;
        // Title starts with term
        else if (titleLower.startsWith(searchTerm)) score = 90;
        // Exact author name match
        else if (authorLower === searchTerm) score = 80;
        // Author name starts with term
        else if (authorLower.startsWith(searchTerm)) score = 70;
        // Title contains term at word boundary
        else if (new RegExp(`\\b${searchTerm}`, 'i').test(r.title)) score = 50;
        // Author contains term at word boundary
        else if (new RegExp(`\\b${searchTerm}`, 'i').test(r.author_name)) score = 40;
        // Title contains term anywhere
        else if (titleLower.includes(searchTerm)) score = 20;
        // Author contains term anywhere
        else if (authorLower.includes(searchTerm)) score = 10;

        return { ...r, score };
      })
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limitNum);

    res.json(scored);
  } catch (err) {
    console.error('Search requests error:', err);
    res.status(500).json({ error: 'Failed to search requests' });
  }
});

// Get all requests (all users can see all requests)
router.get('/', authenticateToken, (req, res) => {
  try {
    const { status, category, priority, sort, order, myRequests, timePeriod, search } = req.query;
    const isAdmin = req.user.role === 'admin';

    let query = `
      SELECT
        r.*,
        u.name as author_name,
        u.email as author_email,
        (SELECT COUNT(*) FROM votes WHERE request_id = r.id AND type = 'upvote') as upvotes,
        (SELECT COUNT(*) FROM votes WHERE request_id = r.id AND type = 'like') as likes,
        (SELECT COUNT(*) FROM comments WHERE request_id = r.id) as comment_count
      FROM requests r
      JOIN users u ON r.user_id = u.id
      WHERE 1=1
    `;

    const params = [];

    // Only filter by user if explicitly requested (for My Requests page)
    if (myRequests === 'true') {
      query += ' AND r.user_id = ?';
      params.push(req.user.id);
    }

    // Time period filter
    if (timePeriod) {
      const now = new Date();
      let startDate;

      switch (timePeriod) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case '7days':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30days':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90days':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = null;
      }

      if (startDate) {
        query += ' AND r.created_at >= ?';
        params.push(startDate.toISOString());
      }
    }

    // Search filter
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      query += ' AND (r.title LIKE ? OR u.name LIKE ?)';
      params.push(searchTerm, searchTerm);
    }

    // Filters
    if (status) {
      query += ' AND r.status = ?';
      params.push(status);
    }
    if (category) {
      query += ' AND r.category = ?';
      params.push(category);
    }
    if (priority) {
      query += ' AND r.priority = ?';
      params.push(priority);
    }

    // Sorting
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';
    if (sort === 'popularity') {
      query += ` ORDER BY (upvotes + likes) ${sortOrder}, r.created_at DESC`;
    } else if (sort === 'upvotes') {
      query += ` ORDER BY upvotes ${sortOrder}, r.created_at DESC`;
    } else if (sort === 'likes') {
      query += ` ORDER BY likes ${sortOrder}, r.created_at DESC`;
    } else {
      query += ` ORDER BY r.created_at ${sortOrder}`;
    }

    const requests = db.all(query, params);

    // Get user votes and read status for each request
    const requestsWithUserVotes = requests.map(request => {
      const userVotes = db.all(
        'SELECT type FROM votes WHERE request_id = ? AND user_id = ?',
        [request.id, req.user.id]
      );

      // Check if admin has read this request
      let isRead = true; // Default to true for non-admins
      if (isAdmin) {
        const readRecord = db.get(
          'SELECT id FROM admin_read_requests WHERE request_id = ? AND admin_id = ?',
          [request.id, req.user.id]
        );
        isRead = !!readRecord;
      }

      return {
        ...request,
        userVotes: userVotes.map(v => v.type),
        isRead
      };
    });

    res.json(requestsWithUserVotes);
  } catch (err) {
    console.error('Get requests error:', err);
    res.status(500).json({ error: 'Failed to get requests' });
  }
});

// Get single request with full details
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const request = db.get(`
      SELECT
        r.*,
        u.name as author_name,
        u.email as author_email,
        (SELECT COUNT(*) FROM votes WHERE request_id = r.id AND type = 'upvote') as upvotes,
        (SELECT COUNT(*) FROM votes WHERE request_id = r.id AND type = 'like') as likes
      FROM requests r
      JOIN users u ON r.user_id = u.id
      WHERE r.id = ?
    `, [req.params.id]);

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // Get attachments
    const attachments = db.all('SELECT * FROM attachments WHERE request_id = ?', [req.params.id]);

    // Check if current user has voted
    const userVotes = db.all('SELECT type FROM votes WHERE request_id = ? AND user_id = ?', [req.params.id, req.user.id]);

    res.json({
      ...request,
      attachments,
      userVotes: userVotes.map(v => v.type)
    });
  } catch (err) {
    console.error('Get request error:', err);
    res.status(500).json({ error: 'Failed to get request' });
  }
});

// Get interactions for a request (who voted/liked/commented)
router.get('/:id/interactions', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;

    // Get upvoters
    const upvoters = db.all(`
      SELECT u.id, u.name
      FROM votes v
      JOIN users u ON v.user_id = u.id
      WHERE v.request_id = ? AND v.type = 'upvote'
      ORDER BY v.created_at DESC
    `, [id]);

    // Get likers
    const likers = db.all(`
      SELECT u.id, u.name
      FROM votes v
      JOIN users u ON v.user_id = u.id
      WHERE v.request_id = ? AND v.type = 'like'
      ORDER BY v.created_at DESC
    `, [id]);

    // Get commenters (unique)
    const commenters = db.all(`
      SELECT DISTINCT u.id, u.name
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.request_id = ?
    `, [id]);

    res.json({
      upvoters,
      likers,
      commenters
    });
  } catch (err) {
    console.error('Get interactions error:', err);
    res.status(500).json({ error: 'Failed to get interactions' });
  }
});

// Create request
router.post('/', authenticateToken, upload.array('attachments', 5), (req, res) => {
  try {
    const { title, category, priority, team, region, business_problem, problem_size, business_expectations, expected_impact } = req.body;

    if (!title || !title.trim() || !category || !priority) {
      return res.status(400).json({ error: 'Title, category, and priority are required' });
    }

    const result = db.run(`
      INSERT INTO requests (user_id, title, category, priority, team, region, business_problem, problem_size, business_expectations, expected_impact)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [req.user.id, title, category, priority, team || 'Manufacturing', region || 'Global', business_problem || '', problem_size || '', business_expectations || '', expected_impact || '']);

    // Save attachments
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        db.run(
          'INSERT INTO attachments (request_id, filename, filepath) VALUES (?, ?, ?)',
          [result.lastInsertRowid, file.originalname, file.filename]
        );
      }
    }

    const request = db.get('SELECT * FROM requests WHERE id = ?', [result.lastInsertRowid]);
    const attachments = db.all('SELECT * FROM attachments WHERE request_id = ?', [result.lastInsertRowid]);

    res.status(201).json({ ...request, attachments });
  } catch (err) {
    console.error('Create request error:', err);
    res.status(500).json({ error: 'Failed to create request' });
  }
});

// Update request (admin can update status, owner can update content)
router.patch('/:id', authenticateToken, (req, res) => {
  try {
    const request = db.get('SELECT * FROM requests WHERE id = ?', [req.params.id]);

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const isOwner = request.user_id === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Not authorized to update this request' });
    }

    const { status, title, category, priority, team, region, business_problem, problem_size, business_expectations, expected_impact } = req.body;

    // Admin can update status - log activity
    if (isAdmin && status && status !== request.status) {
      db.run('UPDATE requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, req.params.id]);
      // Log the status change
      db.run(
        'INSERT INTO activity_log (request_id, user_id, action, old_value, new_value) VALUES (?, ?, ?, ?, ?)',
        [req.params.id, req.user.id, 'status_change', request.status, status]
      );
    }

    // Owner can update content
    if (isOwner) {
      const updates = [];
      const values = [];

      if (title) { updates.push('title = ?'); values.push(title); }
      if (category) { updates.push('category = ?'); values.push(category); }
      if (priority) { updates.push('priority = ?'); values.push(priority); }
      if (team) { updates.push('team = ?'); values.push(team); }
      if (region) { updates.push('region = ?'); values.push(region); }
      if (business_problem !== undefined) { updates.push('business_problem = ?'); values.push(business_problem); }
      if (problem_size !== undefined) { updates.push('problem_size = ?'); values.push(problem_size); }
      if (business_expectations !== undefined) { updates.push('business_expectations = ?'); values.push(business_expectations); }
      if (expected_impact !== undefined) { updates.push('expected_impact = ?'); values.push(expected_impact); }

      if (updates.length > 0) {
        updates.push('updated_at = CURRENT_TIMESTAMP');
        values.push(req.params.id);
        db.run(`UPDATE requests SET ${updates.join(', ')} WHERE id = ?`, values);
      }
    }

    const updatedRequest = db.get('SELECT * FROM requests WHERE id = ?', [req.params.id]);
    res.json(updatedRequest);
  } catch (err) {
    console.error('Update request error:', err);
    res.status(500).json({ error: 'Failed to update request' });
  }
});

// Get activity log for a request
router.get('/:id/activity', authenticateToken, (req, res) => {
  try {
    const activities = db.all(`
      SELECT
        a.*,
        u.name as user_name
      FROM activity_log a
      JOIN users u ON a.user_id = u.id
      WHERE a.request_id = ?
      ORDER BY a.created_at DESC
    `, [req.params.id]);

    res.json(activities);
  } catch (err) {
    console.error('Get activity log error:', err);
    res.status(500).json({ error: 'Failed to get activity log' });
  }
});

// Delete request (admin only)
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const request = db.get('SELECT * FROM requests WHERE id = ?', [req.params.id]);

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    db.run('DELETE FROM requests WHERE id = ?', [req.params.id]);
    res.json({ message: 'Request deleted successfully' });
  } catch (err) {
    console.error('Delete request error:', err);
    res.status(500).json({ error: 'Failed to delete request' });
  }
});

// Mark request as read (admin only)
router.post('/:id/read', authenticateToken, requireAdmin, (req, res) => {
  try {
    const request = db.get('SELECT * FROM requests WHERE id = ?', [req.params.id]);

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // Check if already marked as read
    const existing = db.get(
      'SELECT id FROM admin_read_requests WHERE request_id = ? AND admin_id = ?',
      [req.params.id, req.user.id]
    );

    if (!existing) {
      db.run(
        'INSERT INTO admin_read_requests (request_id, admin_id) VALUES (?, ?)',
        [req.params.id, req.user.id]
      );
    }

    res.json({ message: 'Request marked as read' });
  } catch (err) {
    console.error('Mark request as read error:', err);
    res.status(500).json({ error: 'Failed to mark request as read' });
  }
});

export default router;
