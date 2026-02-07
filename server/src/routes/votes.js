import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requestRepository } from '../repositories/requestRepository.js';
import { voteRepository } from '../repositories/voteRepository.js';
import { ValidationError, NotFoundError } from '../errors/AppError.js';

const router = Router();

// Add vote
router.post('/:requestId/vote', authenticateToken, asyncHandler(async (req, res) => {
  const { type } = req.body;
  const { requestId } = req.params;

  if (!type || !['upvote', 'like'].includes(type)) {
    throw new ValidationError('Vote type must be "upvote" or "like"');
  }

  await requestRepository.findByIdOrFail(requestId);
  await voteRepository.create(requestId, req.user.id, type);

  const [counts, userVotes] = await Promise.all([
    voteRepository.getCounts(requestId),
    voteRepository.getUserVoteTypes(requestId, req.user.id),
  ]);

  res.json({ message: 'Vote added', ...counts, userVotes });
}));

// Remove vote
router.delete('/:requestId/vote/:type', authenticateToken, asyncHandler(async (req, res) => {
  const { requestId, type } = req.params;

  if (!['upvote', 'like'].includes(type)) {
    throw new ValidationError('Vote type must be "upvote" or "like"');
  }

  const existing = await voteRepository.findByRequestAndUser(requestId, req.user.id, type);
  if (!existing) throw new NotFoundError('Vote');

  await voteRepository.delete(requestId, req.user.id, type);

  const [counts, userVotes] = await Promise.all([
    voteRepository.getCounts(requestId),
    voteRepository.getUserVoteTypes(requestId, req.user.id),
  ]);

  res.json({ message: 'Vote removed', ...counts, userVotes });
}));

// Get vote counts
router.get('/:requestId/votes', authenticateToken, asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const [counts, userVotes] = await Promise.all([
    voteRepository.getCounts(requestId),
    voteRepository.getUserVoteTypes(requestId, req.user.id),
  ]);
  res.json({ ...counts, userVotes });
}));

export default router;
