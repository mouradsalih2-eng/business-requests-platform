import express from 'express';
import { get, all, run } from '../db/database.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get all feature flags (public - client needs this to check flags)
router.get('/', (req, res) => {
  try {
    const flags = all('SELECT name, enabled, description FROM feature_flags ORDER BY name ASC');
    res.json(flags);
  } catch (error) {
    console.error('Error fetching feature flags:', error);
    res.status(500).json({ error: 'Failed to fetch feature flags' });
  }
});

// Toggle a feature flag (admin only)
router.patch('/:name', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { name } = req.params;
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled must be a boolean' });
    }

    // Check if flag exists
    const existing = get('SELECT * FROM feature_flags WHERE name = ?', [name]);
    if (!existing) {
      return res.status(404).json({ error: 'Feature flag not found' });
    }

    // Update the flag
    run(
      'UPDATE feature_flags SET enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE name = ?',
      [enabled ? 1 : 0, name]
    );

    const updated = get('SELECT name, enabled, description FROM feature_flags WHERE name = ?', [name]);
    res.json(updated);
  } catch (error) {
    console.error('Error updating feature flag:', error);
    res.status(500).json({ error: 'Failed to update feature flag' });
  }
});

// Helper function to check if a feature is enabled (for use by other routes)
export function isFeatureEnabled(name) {
  try {
    const flag = get('SELECT enabled FROM feature_flags WHERE name = ?', [name]);
    // Default to enabled if flag doesn't exist
    return flag ? flag.enabled === 1 : true;
  } catch {
    return true;
  }
}

export default router;
