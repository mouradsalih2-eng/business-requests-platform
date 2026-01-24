import { Router } from 'express';
import db from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Helper: Extract @mentions from content (matches @FirstName pattern)
function extractMentions(content) {
  const mentionRegex = /@(\w+(?:\s+\w+)?)/g;
  const matches = [];
  let match;
  while ((match = mentionRegex.exec(content)) !== null) {
    matches.push(match[1]); // The name part without @
  }
  return [...new Set(matches)]; // Remove duplicates
}

// Helper: Find user IDs from mentioned names
function findMentionedUserIds(mentionedNames) {
  if (!mentionedNames || mentionedNames.length === 0) return [];

  const userIds = [];
  for (const name of mentionedNames) {
    // Try exact match first, then partial match
    const user = db.get(
      'SELECT id FROM users WHERE name = ? OR name LIKE ?',
      [name, `${name}%`]
    );
    if (user) {
      userIds.push(user.id);
    }
  }
  return [...new Set(userIds)];
}

// Helper: Save mentions for a comment (safe - won't throw if table missing)
function saveMentions(commentId, userIds) {
  try {
    // Delete existing mentions for this comment
    db.run('DELETE FROM comment_mentions WHERE comment_id = ?', [commentId]);

    // Insert new mentions
    for (const userId of userIds) {
      try {
        db.run(
          'INSERT INTO comment_mentions (comment_id, user_id) VALUES (?, ?)',
          [commentId, userId]
        );
      } catch (err) {
        // Ignore duplicate key errors
        if (!err.message?.includes('UNIQUE constraint')) {
          console.error('Save mention error:', err);
        }
      }
    }
  } catch (err) {
    // Table might not exist yet - this is non-fatal
    console.error('saveMentions error (table may not exist):', err.message);
  }
}

// Helper: Get mentions for a comment (safe - returns empty array if table missing)
function getMentionsForComment(commentId) {
  try {
    return db.all(`
      SELECT u.id, u.name, u.email
      FROM comment_mentions cm
      JOIN users u ON cm.user_id = u.id
      WHERE cm.comment_id = ?
    `, [commentId]);
  } catch (err) {
    // Table might not exist yet
    console.error('getMentionsForComment error:', err.message);
    return [];
  }
}

// Get comments for a request
router.get('/:requestId/comments', authenticateToken, (req, res) => {
  try {
    const { requestId } = req.params;

    const comments = db.all(`
      SELECT
        c.*,
        u.name as author_name,
        u.email as author_email
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.request_id = ?
      ORDER BY c.created_at ASC
    `, [requestId]);

    // Add mentions to each comment
    const commentsWithMentions = comments.map(comment => ({
      ...comment,
      mentions: getMentionsForComment(comment.id)
    }));

    res.json(commentsWithMentions);
  } catch (err) {
    console.error('Get comments error:', err);
    res.status(500).json({ error: 'Failed to get comments' });
  }
});

// Add comment
router.post('/:requestId/comments', authenticateToken, (req, res) => {
  try {
    const { requestId } = req.params;
    const { content } = req.body;

    console.log('Adding comment:', { requestId, userId: req.user?.id, contentLength: content?.length });

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    // Check if request exists
    const request = db.get('SELECT id FROM requests WHERE id = ?', [requestId]);
    if (!request) {
      console.log('Request not found:', requestId);
      return res.status(404).json({ error: 'Request not found' });
    }

    const result = db.run(
      'INSERT INTO comments (request_id, user_id, content) VALUES (?, ?, ?)',
      [requestId, req.user.id, content.trim()]
    );

    const commentId = result.lastInsertRowid;
    console.log('Comment created with ID:', commentId);

    // Extract and save mentions (don't fail comment if mentions fail)
    let mentions = [];
    try {
      const mentionedNames = extractMentions(content);
      const mentionedUserIds = findMentionedUserIds(mentionedNames);
      saveMentions(commentId, mentionedUserIds);
      mentions = getMentionsForComment(commentId);
    } catch (mentionErr) {
      console.error('Mention processing error (non-fatal):', mentionErr);
    }

    const comment = db.get(`
      SELECT
        c.*,
        u.name as author_name,
        u.email as author_email
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `, [commentId]);

    // Add mentions to response
    comment.mentions = mentions;

    res.status(201).json(comment);
  } catch (err) {
    console.error('Add comment error:', err);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// Edit comment (owner only)
router.patch('/:commentId', authenticateToken, (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    const comment = db.get('SELECT * FROM comments WHERE id = ?', [commentId]);

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (comment.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to edit this comment' });
    }

    db.run(
      'UPDATE comments SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [content.trim(), commentId]
    );

    // Re-extract and save mentions (don't fail edit if mentions fail)
    let mentions = [];
    try {
      const mentionedNames = extractMentions(content);
      const mentionedUserIds = findMentionedUserIds(mentionedNames);
      saveMentions(commentId, mentionedUserIds);
      mentions = getMentionsForComment(commentId);
    } catch (mentionErr) {
      console.error('Mention processing error (non-fatal):', mentionErr);
    }

    const updatedComment = db.get(`
      SELECT
        c.*,
        u.name as author_name,
        u.email as author_email
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `, [commentId]);

    // Add mentions to response
    updatedComment.mentions = mentions;

    res.json(updatedComment);
  } catch (err) {
    console.error('Edit comment error:', err);
    res.status(500).json({ error: 'Failed to edit comment' });
  }
});

// Delete comment (owner or admin)
router.delete('/:commentId', authenticateToken, (req, res) => {
  try {
    const { commentId } = req.params;

    const comment = db.get('SELECT * FROM comments WHERE id = ?', [commentId]);

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const isOwner = comment.user_id === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Not authorized to delete this comment' });
    }

    db.run('DELETE FROM comments WHERE id = ?', [commentId]);
    res.json({ message: 'Comment deleted successfully' });
  } catch (err) {
    console.error('Delete comment error:', err);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

export default router;
