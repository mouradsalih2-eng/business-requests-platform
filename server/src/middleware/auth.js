import { supabase } from '../db/supabase.js';
import { userRepository } from '../repositories/userRepository.js';
import { projectMemberRepository } from '../repositories/projectMemberRepository.js';
import { projectRepository } from '../repositories/projectRepository.js';

/**
 * Detect auth provider from Supabase user metadata.
 */
function detectAuthProvider(supabaseUser) {
  const provider = supabaseUser.app_metadata?.provider;
  if (provider === 'google') return 'google';
  if (provider === 'azure') return 'microsoft';
  return 'email';
}

/**
 * Authenticate Supabase Auth JWT tokens.
 * Uses the Supabase admin client to verify tokens (supports all signing algorithms).
 * Then looks up the app user by auth_id (Supabase user UUID).
 * Auto-provisions new OAuth users on first login.
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
    let user = await userRepository.findByAuthId(authId);

    // Auto-provision OAuth users on first login
    if (!user) {
      const supabaseUser = data.user;
      const authProvider = detectAuthProvider(supabaseUser);

      // Only auto-provision for OAuth users (not email/password)
      if (authProvider !== 'email') {
        const email = supabaseUser.email;
        const name = supabaseUser.user_metadata?.full_name
          || supabaseUser.user_metadata?.name
          || email.split('@')[0];

        // Check if admin pre-created this user (invited via Google SSO)
        const existingByEmail = await userRepository.findByEmail(email, 'id, auth_id');
        if (existingByEmail && !existingByEmail.auth_id) {
          // Link the pre-created user to this OAuth account
          await userRepository.updateAuthId(existingByEmail.id, authId);
          user = await userRepository.findByAuthId(authId);
          console.log(`Linked pre-created user to OAuth: ${email} (${authProvider})`);
        } else if (!existingByEmail) {
          // Auto-provision new OAuth user
          user = await userRepository.create({
            email,
            name,
            role: 'employee',
            auth_id: authId,
            auth_provider: authProvider,
          });

          // Add to default project
          const defaultProject = await projectRepository.findBySlug('default');
          if (defaultProject) {
            await projectMemberRepository.addMember(defaultProject.id, user.id, 'member');
          }

          console.log(`Auto-provisioned OAuth user: ${email} (${authProvider})`);

          // Re-fetch with full columns
          user = await userRepository.findByAuthId(authId);
        }
      }

      if (!user) {
        console.error('Auth: no user found for auth_id:', authId);
        return res.status(401).json({ error: 'User not found' });
      }
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Auth error:', err.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireAdmin(req, res, next) {
  // super_admin has global admin access
  if (req.user.role === 'super_admin') return next();
  // project-level admin (set by requireProject middleware)
  if (req.projectRole === 'admin') return next();
  // legacy global admin
  if (req.user.role === 'admin') return next();
  return res.status(403).json({ error: 'Admin access required' });
}
