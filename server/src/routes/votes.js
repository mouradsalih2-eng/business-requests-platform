import { Router } from 'express';
import db from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Add vote (upvote or like)
router.post('/:requestId/vote', authenticateToken, (req, res) => {
  try {
    const { type } = req.body;
    const { requestId } = req.params;

    if (!type || !['upvote', 'like'].includes(type)) {
      return res.status(400).json({ error: 'Vote type must be "upvote" or "like"' });
    }

    // Check if request exists
    const request = db.get('SELECT id FROM requests WHERE id = ?', [requestId]);
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // Check if already voted this type
    const existingVote = db.get(
      'SELECT id FROM votes WHERE request_id = ? AND user_id = ? AND type = ?',
      [requestId, req.user.id, type]
    );

    if (existingVote) {
      return res.status(400).json({ error: `You have already ${type}d this request` });
    }

    // Add vote
    db.run(
      'INSERT INTO votes (request_id, user_id, type) VALUES (?, ?, ?)',
      [requestId, req.user.id, type]
    );

    // Get updated counts
    const upvotes = db.get('SELECT COUNT(*) as count FROM votes WHERE request_id = ? AND type = ?', [requestId, 'upvote']);
    const likes = db.get('SELECT COUNT(*) as count FROM votes WHERE request_id = ? AND type = ?', [requestId, 'like']);

    // Get user's current votes
    const userVotes = db.all(
      'SELECT type FROM votes WHERE request_id = ? AND user_id = ?',
      [requestId, req.user.id]
    );

    res.json({
      message: 'Vote added',
      upvotes: upvotes.count,
      likes: likes.count,
      userVotes: userVotes.map(v => v.type)
    });
  } catch (err) {
    console.error('Add vote error:', err);
    res.status(500).json({ error: 'Failed to add vote' });
  }
});

// Remove vote
router.delete('/:requestId/vote/:type', authenticateToken, (req, res) => {
  try {
    const { requestId, type } = req.params;

    if (!['upvote', 'like'].includes(type)) {
      return res.status(400).json({ error: 'Vote type must be "upvote" or "like"' });
    }

    const existingVote = db.get(
      'SELECT id FROM votes WHERE request_id = ? AND user_id = ? AND type = ?',
      [requestId, req.user.id, type]
    );

    if (!existingVote) {
      return res.status(404).json({ error: 'Vote not found' });
    }

    db.run(
      'DELETE FROM votes WHERE request_id = ? AND user_id = ? AND type = ?',
      [requestId, req.user.id, type]
    );

    // Get updated counts
    const upvotes = db.get('SELECT COUNT(*) as count FROM votes WHERE request_id = ? AND type = ?', [requestId, 'upvote']);
    const likes = db.get('SELECT COUNT(*) as count FROM votes WHERE request_id = ? AND type = ?', [requestId, 'like']);

    // Get user's remaining votes
    const userVotes = db.all(
      'SELECT type FROM votes WHERE request_id = ? AND user_id = ?',
      [requestId, req.user.id]
    );

    res.json({
      message: 'Vote removed',
      upvotes: upvotes.count,
      likes: likes.count,
      userVotes: userVotes.map(v => v.type)
    });
  } catch (err) {
    console.error('Remove vote error:', err);
    res.status(500).json({ error: 'Failed to remove vote' });
  }
});

// Get vote counts for a request
router.get('/:requestId/votes', authenticateToken, (req, res) => {
  try {
    const { requestId } = req.params;

    const upvotes = db.get('SELECT COUNT(*) as count FROM votes WHERE request_id = ? AND type = ?', [requestId, 'upvote']);
    const likes = db.get('SELECT COUNT(*) as count FROM votes WHERE request_id = ? AND type = ?', [requestId, 'like']);

    // Check if current user has voted
    const userVotes = db.all(
      'SELECT type FROM votes WHERE request_id = ? AND user_id = ?',
      [requestId, req.user.id]
    );

    res.json({
      upvotes: upvotes.count,
      likes: likes.count,
      userVotes: userVotes.map(v => v.type)
    });
  } catch (err) {
    console.error('Get votes error:', err);
    res.status(500).json({ error: 'Failed to get votes' });
  }
});

export default router;
