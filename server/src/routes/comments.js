import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requestRepository } from '../repositories/requestRepository.js';
import { commentRepository, mentionRepository } from '../repositories/commentRepository.js';
import { watcherRepository } from '../repositories/watcherRepository.js';
import { userRepository } from '../repositories/userRepository.js';
import { ValidationError, ForbiddenError } from '../errors/AppError.js';

const router = Router();

// ── Mention helpers ──────────────────────────────────────────

function extractMentionNames(content) {
  const regex = /@(\w+(?:\s+\w+)?)/g;
  const names = [];
  let match;
  while ((match = regex.exec(content)) !== null) names.push(match[1]);
  return [...new Set(names)];
}

async function processMentions(commentId, content) {
  try {
    const names = extractMentionNames(content);
    const userIds = await mentionRepository.findUserIdsByNames(names);
    await mentionRepository.saveMentions(commentId, userIds);
    return await mentionRepository.getMentions(commentId);
  } catch {
    return [];
  }
}

// ── Routes ───────────────────────────────────────────────────

// Get comments for a request
router.get('/:requestId/comments', authenticateToken, asyncHandler(async (req, res) => {
  const comments = await commentRepository.findByRequest(req.params.requestId);

  const withMentions = await Promise.all(
    comments.map(async (c) => ({
      ...c,
      mentions: await mentionRepository.getMentions(c.id),
    }))
  );

  res.json(withMentions);
}));

// Add comment
router.post('/:requestId/comments', authenticateToken, asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const { content } = req.body;

  if (!content?.trim()) throw new ValidationError('Comment content is required');

  await requestRepository.findByIdOrFail(requestId);
  const { id: commentId } = await commentRepository.create(requestId, req.user.id, content.trim());

  // Auto-watch on comment (if user preference allows)
  try {
    const user = await userRepository.findById(req.user.id, 'id, auto_watch_on_comment');
    if (user?.auto_watch_on_comment !== false) {
      await watcherRepository.watch(requestId, req.user.id, true);
    }
  } catch { /* non-critical */ }

  const mentions = await processMentions(commentId, content);
  const comment = await commentRepository.findByIdWithAuthor(commentId);

  res.status(201).json({ ...comment, mentions });
}));

// Edit comment (owner only)
router.patch('/:commentId', authenticateToken, asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { content } = req.body;

  if (!content?.trim()) throw new ValidationError('Comment content is required');

  const comment = await commentRepository.findById(commentId);
  if (!comment) return res.status(404).json({ error: 'Comment not found' });
  if (comment.user_id !== req.user.id) throw new ForbiddenError('Not authorized to edit this comment');

  await commentRepository.update(commentId, content.trim());
  const mentions = await processMentions(commentId, content);
  const updated = await commentRepository.findByIdWithAuthor(commentId);

  res.json({ ...updated, mentions });
}));

// Delete comment (owner or admin)
router.delete('/:commentId', authenticateToken, asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const comment = await commentRepository.findById(commentId);
  if (!comment) return res.status(404).json({ error: 'Comment not found' });

  const isOwner = comment.user_id === req.user.id;
  const isAdmin = req.user.role === 'admin';
  if (!isOwner && !isAdmin) throw new ForbiddenError('Not authorized to delete this comment');

  await commentRepository.delete(commentId);
  res.json({ message: 'Comment deleted successfully' });
}));

export default router;
