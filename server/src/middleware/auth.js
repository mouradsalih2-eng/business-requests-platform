import { supabase } from '../db/supabase.js';
import { userRepository } from '../repositories/userRepository.js';

/**
 * Authenticate Supabase Auth JWT tokens.
 * Uses the Supabase admin client to verify tokens (supports all signing algorithms).
 * Then looks up the app user by auth_id (Supabase user UUID).
 */
export async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const authId = data.user.id;
    const user = await userRepository.findByAuthId(authId);

    if (!user) {
      console.error('Auth: no user found for auth_id:', authId);
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Auth error:', err.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}
