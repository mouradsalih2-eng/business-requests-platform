import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Generate a secure random secret if not provided via environment variable
// WARNING: In production, always set JWT_SECRET in environment variables
// because a generated secret will change on server restart, invalidating all tokens
const JWT_SECRET = process.env.JWT_SECRET || (() => {
  if (process.env.NODE_ENV === 'production') {
    console.error('FATAL: JWT_SECRET must be set in production environment');
    process.exit(1);
  }
  console.warn('WARNING: JWT_SECRET not set. Using temporary secret. All tokens will be invalid after restart.');
  return crypto.randomBytes(64).toString('hex');
})();

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const user = jwt.verify(token, JWT_SECRET);
    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

export { JWT_SECRET };
