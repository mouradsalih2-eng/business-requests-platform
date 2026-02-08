import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validateBody } from '../middleware/validate.js';
import { forgotPasswordSchema, resetPasswordSchema } from '../validation/schemas.js';
import { authService } from '../services/authService.js';

const router = Router();

// Register — disabled (admin creates users)
router.post('/register', (_req, res) => {
  res.status(403).json({ error: 'Registration is disabled. Please contact an administrator to get an account.' });
});

// Initiate registration with email verification
router.post('/register/initiate', asyncHandler(async (req, res) => {
  const { email, password, name } = req.body;
  const result = await authService.initiateRegistration(email, password, name);
  res.json(result);
}));

// Verify registration code and create account
router.post('/register/verify', asyncHandler(async (req, res) => {
  const { email, code } = req.body;
  const result = await authService.verifyRegistration(email, code);
  res.json(result);
}));

// Resend registration verification code
router.post('/register/resend', asyncHandler(async (req, res) => {
  const { email } = req.body;
  const result = await authService.resendRegistrationCode(email);
  res.json(result);
}));

// Force password change (first login with temp password)
router.post('/force-password-change', authenticateToken, asyncHandler(async (req, res) => {
  const { new_password } = req.body;
  const result = await authService.forcePasswordChange(req.user.id, new_password);
  res.json(result);
}));

// Request password change (authenticated)
router.post('/password/request-change', authenticateToken, asyncHandler(async (req, res) => {
  const { old_password, new_password } = req.body;
  const result = await authService.requestPasswordChange(req.user.id, old_password, new_password);
  res.json(result);
}));

// Confirm password change with verification code + new password
router.post('/password/change', authenticateToken, asyncHandler(async (req, res) => {
  const { code, new_password } = req.body;
  const result = await authService.confirmPasswordChange(req.user.id, code, new_password);
  res.json(result);
}));

// Login (server-mediated — signs in via Supabase Auth, returns session + app user)
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password);
  res.json(result);
}));

// Get current user
router.get('/me', authenticateToken, asyncHandler(async (req, res) => {
  const user = await authService.getMe(req.user.id);
  res.json(user);
}));

// Forgot password
router.post('/forgot-password', validateBody(forgotPasswordSchema), asyncHandler(async (req, res) => {
  const result = await authService.forgotPassword(req.body.email);
  res.json(result);
}));

// Reset password
router.post('/reset-password', validateBody(resetPasswordSchema), asyncHandler(async (req, res) => {
  const result = await authService.resetPassword(req.body.token, req.body.password);
  res.json(result);
}));

export default router;
