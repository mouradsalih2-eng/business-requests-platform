import express from 'express';
import { run, get, all } from '../db/database.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { roadmapItemSchema, roadmapMoveSchema } from '../validation/schemas.js';
import { isFeatureEnabled } from './feature-flags.js';

const router = express.Router();

// Middleware to check if roadmap feature is enabled
router.use((req, res, next) => {
  if (!isFeatureEnabled('roadmap_kanban')) {
    return res.status(403).json({ error: 'Roadmap feature is currently disabled' });
  }
  next();
});

// Get all roadmap items grouped by column
// Also includes requests that aren't explicitly added to roadmap
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Get explicitly added roadmap items
    const roadmapItems = all(`
      SELECT
        ri.*,
        r.title as request_title,
        r.status as request_status,
        r.category as request_category,
        r.priority as request_priority,
        r.team as request_team,
        r.region as request_region,
        u.name as created_by_name,
        'roadmap' as source
      FROM roadmap_items ri
      LEFT JOIN requests r ON ri.request_id = r.id
      LEFT JOIN users u ON ri.created_by = u.id
      ORDER BY ri.position ASC, ri.created_at ASC
    `);

    // Get request IDs that are already in roadmap
    const linkedRequestIds = roadmapItems
      .filter(item => item.request_id)
      .map(item => item.request_id);

    // Get requests that aren't in roadmap yet (excluding rejected/duplicate)
    const requestsNotInRoadmap = all(`
      SELECT
        r.id,
        r.id as request_id,
        r.title,
        r.business_problem as description,
        r.category,
        r.priority,
        r.team,
        r.region,
        r.status,
        r.created_at,
        r.updated_at,
        u.name as created_by_name,
        'request' as source
      FROM requests r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.status NOT IN ('rejected', 'duplicate', 'archived')
      ORDER BY r.created_at DESC
    `).filter(r => !linkedRequestIds.includes(r.id));

    // Map request status to roadmap column
    const statusToColumn = {
      pending: 'backlog',
      backlog: 'backlog',
      in_progress: 'in_progress',
      completed: 'released',
    };

    // Group by column_status (discovery is now a flag, not a column)
    const grouped = {
      backlog: [],
      in_progress: [],
      released: [],
    };

    // Add roadmap items first (they have explicit positions)
    roadmapItems.forEach(item => {
      if (grouped[item.column_status]) {
        grouped[item.column_status].push(item);
      }
    });

    // Add requests that aren't in roadmap (at the end of each column)
    requestsNotInRoadmap.forEach(request => {
      const column = statusToColumn[request.status] || 'backlog';
      if (grouped[column]) {
        // Create a roadmap-like item from the request
        grouped[column].push({
          id: `request-${request.id}`,
          request_id: request.id,
          title: request.title,
          description: request.description,
          category: request.category,
          priority: request.priority,
          team: request.team,
          region: request.region,
          column_status: column,
          position: 999999, // Put at end
          created_at: request.created_at,
          updated_at: request.updated_at,
          created_by_name: request.created_by_name,
          source: 'request',
          is_synced: true, // Flag to indicate this is auto-synced from request
        });
      }
    });

    res.json(grouped);
  } catch (error) {
    console.error('Error fetching roadmap:', error);
    res.status(500).json({ error: 'Failed to fetch roadmap' });
  }
});

// Create roadmap item (admin only)
router.post('/', authenticateToken, requireAdmin, validateBody(roadmapItemSchema), async (req, res) => {
  try {
    const { request_id, title, description, category, priority, team, region, column_status = 'backlog', is_discovery = false } = req.body;

    // Validate column_status (discovery is no longer a column)
    const validColumns = ['backlog', 'in_progress', 'released'];
    const finalColumn = validColumns.includes(column_status) ? column_status : 'backlog';

    // Get max position for the column
    const maxPos = get(
      'SELECT MAX(position) as max_pos FROM roadmap_items WHERE column_status = ?',
      [finalColumn]
    );
    const position = (maxPos?.max_pos ?? -1) + 1;

    const result = run(`
      INSERT INTO roadmap_items (request_id, title, description, category, priority, team, region, column_status, position, created_by, is_discovery)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [request_id || null, title, description || null, category || null, priority || null, team || null, region || null, finalColumn, position, req.user.id, is_discovery ? 1 : 0]);

    const item = get('SELECT * FROM roadmap_items WHERE id = ?', [result.lastInsertRowid]);

    // If linked to a request, sync request status
    if (request_id && finalColumn !== 'backlog') {
      const statusMap = {
        in_progress: 'in_progress',
        released: 'completed',
      };
      if (statusMap[finalColumn]) {
        run('UPDATE requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [statusMap[finalColumn], request_id]);
      }
    }

    res.status(201).json(item);
  } catch (error) {
    console.error('Error creating roadmap item:', error);
    res.status(500).json({ error: 'Failed to create roadmap item' });
  }
});

// Update roadmap item (admin only)
router.patch('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, priority, team, region } = req.body;

    const existing = get('SELECT * FROM roadmap_items WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Roadmap item not found' });
    }

    const updates = [];
    const values = [];

    if (title !== undefined) { updates.push('title = ?'); values.push(title); }
    if (description !== undefined) { updates.push('description = ?'); values.push(description); }
    if (category !== undefined) { updates.push('category = ?'); values.push(category); }
    if (priority !== undefined) { updates.push('priority = ?'); values.push(priority); }
    if (team !== undefined) { updates.push('team = ?'); values.push(team); }
    if (region !== undefined) { updates.push('region = ?'); values.push(region); }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    run(`UPDATE roadmap_items SET ${updates.join(', ')} WHERE id = ?`, values);

    const item = get('SELECT * FROM roadmap_items WHERE id = ?', [id]);
    res.json(item);
  } catch (error) {
    console.error('Error updating roadmap item:', error);
    res.status(500).json({ error: 'Failed to update roadmap item' });
  }
});

// Move roadmap item to different column (admin only)
router.patch('/:id/move', authenticateToken, requireAdmin, validateBody(roadmapMoveSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { column_status, position } = req.body;

    const existing = get('SELECT * FROM roadmap_items WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Roadmap item not found' });
    }

    const oldColumn = existing.column_status;
    const oldPosition = existing.position;

    // Update positions in old column (shift down)
    if (oldColumn === column_status) {
      // Moving within same column
      if (position > oldPosition) {
        // Moving down: shift items up
        run(
          'UPDATE roadmap_items SET position = position - 1 WHERE column_status = ? AND position > ? AND position <= ?',
          [column_status, oldPosition, position]
        );
      } else if (position < oldPosition) {
        // Moving up: shift items down
        run(
          'UPDATE roadmap_items SET position = position + 1 WHERE column_status = ? AND position >= ? AND position < ?',
          [column_status, position, oldPosition]
        );
      }
    } else {
      // Moving to different column
      // Shift down items in old column
      run(
        'UPDATE roadmap_items SET position = position - 1 WHERE column_status = ? AND position > ?',
        [oldColumn, oldPosition]
      );
      // Shift up items in new column
      run(
        'UPDATE roadmap_items SET position = position + 1 WHERE column_status = ? AND position >= ?',
        [column_status, position]
      );
    }

    // Update the item
    run(
      'UPDATE roadmap_items SET column_status = ?, position = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [column_status, position, id]
    );

    // Sync linked request status
    if (existing.request_id) {
      const statusMap = {
        backlog: 'backlog',
        in_progress: 'in_progress',
        released: 'completed',
      };
      if (statusMap[column_status]) {
        run('UPDATE requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [statusMap[column_status], existing.request_id]);

        // Log activity
        const oldStatus = statusMap[oldColumn] || oldColumn;
        run(`
          INSERT INTO activity_log (request_id, user_id, action, old_value, new_value)
          VALUES (?, ?, 'status_change', ?, ?)
        `, [existing.request_id, req.user.id, oldStatus, statusMap[column_status]]);
      }
    }

    const item = get('SELECT * FROM roadmap_items WHERE id = ?', [id]);
    res.json(item);
  } catch (error) {
    console.error('Error moving roadmap item:', error);
    res.status(500).json({ error: 'Failed to move roadmap item' });
  }
});

// Promote a synced request to a full roadmap item (admin only)
// This is called when dragging a synced item to a different column
router.post('/promote', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { request_id, column_status, position } = req.body;

    if (!request_id) {
      return res.status(400).json({ error: 'request_id is required' });
    }

    // Check if request exists
    const request = get('SELECT * FROM requests WHERE id = ?', [request_id]);
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // Check if already a roadmap item
    const existing = get('SELECT * FROM roadmap_items WHERE request_id = ?', [request_id]);
    if (existing) {
      return res.status(400).json({ error: 'Request is already a roadmap item' });
    }

    const targetColumn = column_status || 'backlog';
    const targetPosition = position ?? 0;

    // Shift positions in the target column
    run(
      'UPDATE roadmap_items SET position = position + 1 WHERE column_status = ? AND position >= ?',
      [targetColumn, targetPosition]
    );

    // Create the roadmap item from the request
    const result = run(`
      INSERT INTO roadmap_items (request_id, title, description, category, priority, team, region, column_status, position, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      request_id,
      request.title,
      request.business_problem || null,
      request.category,
      request.priority,
      request.team,
      request.region,
      targetColumn,
      targetPosition,
      req.user.id
    ]);

    // Update request status based on column
    const statusMap = {
      backlog: 'backlog',
      discovery: 'backlog',
      in_progress: 'in_progress',
      released: 'completed',
    };
    if (statusMap[targetColumn]) {
      run('UPDATE requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [statusMap[targetColumn], request_id]);

      // Log activity
      run(`
        INSERT INTO activity_log (request_id, user_id, action, old_value, new_value)
        VALUES (?, ?, 'status_change', ?, ?)
      `, [request_id, req.user.id, request.status, statusMap[targetColumn]]);
    }

    const item = get(`
      SELECT ri.*, u.name as created_by_name
      FROM roadmap_items ri
      LEFT JOIN users u ON ri.created_by = u.id
      WHERE ri.id = ?
    `, [result.lastInsertRowid]);

    res.status(201).json(item);
  } catch (error) {
    console.error('Error promoting request to roadmap item:', error);
    res.status(500).json({ error: 'Failed to promote request' });
  }
});

// Delete roadmap item (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const existing = get('SELECT * FROM roadmap_items WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Roadmap item not found' });
    }

    // Shift positions in the column
    run(
      'UPDATE roadmap_items SET position = position - 1 WHERE column_status = ? AND position > ?',
      [existing.column_status, existing.position]
    );

    run('DELETE FROM roadmap_items WHERE id = ?', [id]);

    res.json({ message: 'Roadmap item deleted' });
  } catch (error) {
    console.error('Error deleting roadmap item:', error);
    res.status(500).json({ error: 'Failed to delete roadmap item' });
  }
});

export default router;
