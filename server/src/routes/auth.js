import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db/database.js';
import { authenticateToken, JWT_SECRET } from '../middleware/auth.js';
import { sendVerificationEmail, generateVerificationCode, getCodeExpiration } from '../services/email.js';

const router = Router();

// Register - DISABLED (users are added by admin only)
router.post('/register', (req, res) => {
  return res.status(403).json({
    error: 'Registration is disabled. Please contact an administrator to get an account.'
  });
});

// Initiate registration with email verification
router.post('/register/initiate', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    // Check if user already exists
    const existingUser = db.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    // Generate verification code
    const code = generateVerificationCode();
    const expiresAt = getCodeExpiration();
    const passwordHash = await bcrypt.hash(password, 10);

    // Delete any existing pending registration for this email
    db.run('DELETE FROM pending_registrations WHERE email = ?', [email]);

    // Create pending registration
    db.run(
      'INSERT INTO pending_registrations (email, password_hash, name, verification_code, expires_at) VALUES (?, ?, ?, ?, ?)',
      [email, passwordHash, name, code, expiresAt]
    );

    // Send verification email
    await sendVerificationEmail(email, code, 'registration');

    res.json({ message: 'Verification code sent to your email' });
  } catch (err) {
    console.error('Registration initiate error:', err);
    res.status(500).json({ error: 'Failed to initiate registration' });
  }
});

// Verify registration code and create account
router.post('/register/verify', async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: 'Email and verification code are required' });
    }

    // Find pending registration
    const pending = db.get(
      'SELECT * FROM pending_registrations WHERE email = ? AND verification_code = ?',
      [email, code]
    );

    if (!pending) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    // Check if code has expired
    if (new Date(pending.expires_at) < new Date()) {
      db.run('DELETE FROM pending_registrations WHERE id = ?', [pending.id]);
      return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
    }

    // Create the user account
    db.run(
      'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)',
      [pending.email, pending.password_hash, pending.name, 'employee']
    );

    // Get the created user
    const user = db.get('SELECT id, email, name, role, profile_picture, theme_preference, created_at FROM users WHERE email = ?', [pending.email]);

    // Delete pending registration
    db.run('DELETE FROM pending_registrations WHERE id = ?', [pending.id]);

    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '1y' }
    );

    res.json({ user, token });
  } catch (err) {
    console.error('Registration verify error:', err);
    res.status(500).json({ error: 'Failed to verify registration' });
  }
});

// Resend registration verification code
router.post('/register/resend', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Find pending registration
    const pending = db.get('SELECT * FROM pending_registrations WHERE email = ?', [email]);

    if (!pending) {
      return res.status(400).json({ error: 'No pending registration found for this email' });
    }

    // Generate new code
    const code = generateVerificationCode();
    const expiresAt = getCodeExpiration();

    // Update pending registration
    db.run(
      'UPDATE pending_registrations SET verification_code = ?, expires_at = ? WHERE id = ?',
      [code, expiresAt, pending.id]
    );

    // Send new verification email
    await sendVerificationEmail(email, code, 'registration');

    res.json({ message: 'Verification code resent to your email' });
  } catch (err) {
    console.error('Resend verification error:', err);
    res.status(500).json({ error: 'Failed to resend verification code' });
  }
});

// Request password change (authenticated user) - validates old password and sends code
router.post('/password/request-change', authenticateToken, async (req, res) => {
  try {
    const { old_password, new_password } = req.body;

    if (!old_password || !new_password) {
      return res.status(400).json({ error: 'Old password and new password are required' });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    const user = db.get('SELECT id, email, password FROM users WHERE id = ?', [req.user.id]);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify old password
    const validPassword = bcrypt.compareSync(old_password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Generate verification code
    const code = generateVerificationCode();
    const expiresAt = getCodeExpiration();

    // Hash the new password for temporary storage
    const newPasswordHash = await bcrypt.hash(new_password, 10);

    // Delete any existing password change codes for this user
    db.run('DELETE FROM verification_codes WHERE email = ? AND type = ?', [user.email, 'password_change']);

    // Create verification code record with pending new password hash
    db.run(
      'INSERT INTO verification_codes (email, code, type, expires_at, pending_data) VALUES (?, ?, ?, ?, ?)',
      [user.email, code, 'password_change', expiresAt, newPasswordHash]
    );

    // Send verification email
    await sendVerificationEmail(user.email, code, 'password_change');

    res.json({ message: 'Verification code sent to your email' });
  } catch (err) {
    console.error('Password change request error:', err);
    res.status(500).json({ error: 'Failed to request password change' });
  }
});

// Change password with verification code
router.post('/password/change', authenticateToken, async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Verification code is required' });
    }

    const user = db.get('SELECT id, email FROM users WHERE id = ?', [req.user.id]);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Find verification code with pending password hash
    const verification = db.get(
      'SELECT * FROM verification_codes WHERE email = ? AND code = ? AND type = ?',
      [user.email, code, 'password_change']
    );

    if (!verification) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    // Check if code has expired
    if (new Date(verification.expires_at) < new Date()) {
      db.run('DELETE FROM verification_codes WHERE id = ?', [verification.id]);
      return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
    }

    // Check if we have pending password hash
    if (!verification.pending_data) {
      db.run('DELETE FROM verification_codes WHERE id = ?', [verification.id]);
      return res.status(400).json({ error: 'Password change request is invalid. Please start over.' });
    }

    // Update password with the pre-hashed new password
    db.run('UPDATE users SET password = ? WHERE id = ?', [verification.pending_data, user.id]);

    // Delete used verification code
    db.run('DELETE FROM verification_codes WHERE id = ?', [verification.id]);

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Password change error:', err);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Login
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const validPassword = bcrypt.compareSync(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '1y' }
    );

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword, token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Get current user
router.get('/me', authenticateToken, (req, res) => {
  try {
    const user = db.get('SELECT id, email, name, role, profile_picture, theme_preference, created_at FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

export default router;
