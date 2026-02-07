import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { userRepository } from '../repositories/userRepository.js';

/**
 * Authenticate Supabase Auth JWT tokens.
 * Verifies the token locally using the Supabase JWT secret,
 * then looks up the app user by auth_id (Supabase user UUID).
 */
export async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  if (!config.supabase.jwtSecret) {
    console.error('SUPABASE_JWT_SECRET is not configured');
    return res.status(500).json({ error: 'Server authentication misconfigured' });
  }

  try {
    const decoded = jwt.verify(token, config.supabase.jwtSecret);
    const authId = decoded.sub;

    if (!authId) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const user = await userRepository.findByAuthId(authId);
    if (!user) {
      console.error('Auth: no user found for auth_id:', authId);
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Auth JWT verify failed:', err.message, '| secret length:', config.supabase.jwtSecret?.length);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}
