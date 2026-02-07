import { AppError } from '../errors/AppError.js';

/**
 * Centralized error-handling middleware.
 * Must be registered as the last middleware in Express.
 */
export function errorHandler(err, req, res, _next) {
  // Operational errors we threw intentionally
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  // Multer file-upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large' });
  }
  if (err.message?.startsWith('Invalid file type') || err.message?.startsWith('Only JPEG')) {
    return res.status(400).json({ error: err.message });
  }

  // Unexpected errors
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
}
