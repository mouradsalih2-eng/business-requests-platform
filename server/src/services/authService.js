import crypto from 'crypto';
import { supabase, supabaseAnon } from '../db/supabase.js';
import { userRepository } from '../repositories/userRepository.js';
import {
  pendingRegistrationRepository,
  verificationCodeRepository,
  passwordResetRepository,
} from '../repositories/authRepository.js';
import { sendVerificationEmail, sendPasswordResetEmail, generateVerificationCode, getCodeExpiration } from './email.js';
import { AppError, ValidationError, UnauthorizedError, NotFoundError } from '../errors/AppError.js';

export const authService = {
  /**
   * Server-mediated login via Supabase Auth.
   * Returns session tokens + app user data in one call.
   */
  async login(email, password) {
    if (!email || !password) throw new ValidationError('Email and password are required');
    if (!supabaseAnon) throw new AppError('Authentication service not configured', 500);

    const { data, error } = await supabaseAnon.auth.signInWithPassword({ email, password });
    if (error) throw new UnauthorizedError('Invalid credentials');

    const user = await userRepository.findByAuthId(data.user.id);
    if (!user) throw new UnauthorizedError('User account not found');

    return {
      user,
      token: data.session.access_token,
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_in: data.session.expires_in,
        expires_at: data.session.expires_at,
      },
    };
  },

  async getMe(userId) {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError('User');
    return user;
  },

  // ── Force password change (first login with temp password) ──

  async forcePasswordChange(userId, newPassword) {
    if (!newPassword) throw new ValidationError('New password is required');
    if (newPassword.length < 6) throw new ValidationError('Password must be at least 6 characters long');

    const user = await userRepository.findById(userId, 'id, email, auth_id, must_change_password');
    if (!user) throw new NotFoundError('User');
    if (!user.must_change_password) throw new ValidationError('Password change is not required');
    if (!user.auth_id) throw new AppError('User account configuration error', 500);

    // Update password via Supabase Auth Admin API
    const { error } = await supabase.auth.admin.updateUserById(user.auth_id, {
      password: newPassword,
    });
    if (error) throw new AppError('Failed to update password', 500);

    // Clear the must_change_password flag
    const updatedUser = await userRepository.clearMustChangePassword(userId);

    return { user: updatedUser, message: 'Password changed successfully' };
  },

  // ── Registration flow ──────────────────────────────────────

  async initiateRegistration(email, password, name) {
    if (!email || !password || !name) throw new ValidationError('Email, password, and name are required');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ValidationError('Please enter a valid email address');

    const existing = await userRepository.findByEmail(email, 'id');
    if (existing) throw new AppError('An account with this email already exists', 400);

    // Clean up any previous pending registration for this email
    const existingPending = await pendingRegistrationRepository.findByEmail(email);
    if (existingPending?.auth_id) {
      await supabase.auth.admin.deleteUser(existingPending.auth_id).catch(() => {});
    }
    if (existingPending) {
      await pendingRegistrationRepository.delete(existingPending.id);
    }

    // Create unconfirmed Supabase Auth user (can't sign in until email verified)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: { name },
    });

    if (authError) throw new AppError('Failed to create account', 500);

    const code = generateVerificationCode();
    const expiresAt = getCodeExpiration();

    await pendingRegistrationRepository.create({
      email,
      name,
      verificationCode: code,
      expiresAt,
      authId: authData.user.id,
    });

    await sendVerificationEmail(email, code, 'registration');

    return { message: 'Verification code sent to your email' };
  },

  async verifyRegistration(email, code) {
    if (!email || !code) throw new ValidationError('Email and verification code are required');

    const pending = await pendingRegistrationRepository.findByEmailAndCode(email, code);
    if (!pending) throw new ValidationError('Invalid verification code');

    if (new Date(pending.expires_at) < new Date()) {
      if (pending.auth_id) {
        await supabase.auth.admin.deleteUser(pending.auth_id).catch(() => {});
      }
      await pendingRegistrationRepository.delete(pending.id);
      throw new ValidationError('Verification code has expired. Please request a new one.');
    }

    if (!pending.auth_id) {
      throw new AppError('Registration state is invalid. Please start over.', 400);
    }

    // Confirm the Supabase Auth user so they can sign in
    const { error: confirmError } = await supabase.auth.admin.updateUserById(pending.auth_id, {
      email_confirm: true,
    });
    if (confirmError) throw new AppError('Failed to confirm account', 500);

    // Create the app user row linked to Supabase Auth
    const user = await userRepository.create({
      email: pending.email,
      name: pending.name,
      role: 'employee',
      auth_id: pending.auth_id,
    });

    await pendingRegistrationRepository.delete(pending.id);

    return { user, message: 'Account created successfully. Please sign in.' };
  },

  async resendRegistrationCode(email) {
    if (!email) throw new ValidationError('Email is required');

    const pending = await pendingRegistrationRepository.findByEmail(email);
    if (!pending) throw new ValidationError('No pending registration found for this email');

    const code = generateVerificationCode();
    const expiresAt = getCodeExpiration();
    await pendingRegistrationRepository.updateCode(pending.id, code, expiresAt);
    await sendVerificationEmail(email, code, 'registration');

    return { message: 'Verification code resent to your email' };
  },

  // ── Password change (authenticated) ────────────────────────

  async requestPasswordChange(userId, oldPassword, newPassword) {
    if (!oldPassword) throw new ValidationError('Current password is required');
    if (!newPassword) throw new ValidationError('New password is required');
    if (newPassword.length < 6) throw new ValidationError('New password must be at least 6 characters long');
    if (!supabaseAnon) throw new AppError('Authentication service not configured', 500);

    const user = await userRepository.findById(userId, 'id, email, auth_id');
    if (!user) throw new NotFoundError('User');

    // Verify current password via Supabase Auth
    const { error } = await supabaseAnon.auth.signInWithPassword({
      email: user.email,
      password: oldPassword,
    });
    if (error) throw new ValidationError('Current password is incorrect');

    const code = generateVerificationCode();
    const expiresAt = getCodeExpiration();

    await verificationCodeRepository.deleteByEmailAndType(user.email, 'password_change');
    await verificationCodeRepository.create({
      email: user.email,
      code,
      type: 'password_change',
      expiresAt,
    });
    await sendVerificationEmail(user.email, code, 'password_change');

    return { message: 'Verification code sent to your email' };
  },

  async confirmPasswordChange(userId, code, newPassword) {
    if (!code) throw new ValidationError('Verification code is required');
    if (!newPassword) throw new ValidationError('New password is required');
    if (newPassword.length < 6) throw new ValidationError('New password must be at least 6 characters long');

    const user = await userRepository.findById(userId, 'id, email, auth_id');
    if (!user) throw new NotFoundError('User');

    const verification = await verificationCodeRepository.findByEmailCodeType(user.email, code, 'password_change');
    if (!verification) throw new ValidationError('Invalid verification code');

    if (new Date(verification.expires_at) < new Date()) {
      await verificationCodeRepository.delete(verification.id);
      throw new ValidationError('Verification code has expired. Please request a new one.');
    }

    if (!user.auth_id) throw new AppError('User account configuration error', 500);

    // Update password via Supabase Auth Admin API
    const { error } = await supabase.auth.admin.updateUserById(user.auth_id, {
      password: newPassword,
    });
    if (error) throw new AppError('Failed to update password', 500);

    await verificationCodeRepository.delete(verification.id);

    return { message: 'Password changed successfully' };
  },

  // ── Forgot / Reset password ────────────────────────────────

  async forgotPassword(email) {
    const user = await userRepository.findByEmail(email, 'id, email, name, auth_id');
    const genericMsg = 'If an account exists with this email, you will receive a password reset link.';
    if (!user || !user.auth_id) return { message: genericMsg };

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    await passwordResetRepository.deleteByUserId(user.id);
    await passwordResetRepository.create(user.id, token, expiresAt);
    await sendPasswordResetEmail(email, token, user.name);

    return { message: genericMsg };
  },

  async resetPassword(token, newPassword) {
    const resetToken = await passwordResetRepository.findByToken(token);
    if (!resetToken) throw new ValidationError('Invalid or expired reset token');

    if (new Date(resetToken.expires_at) < new Date()) {
      await passwordResetRepository.delete(resetToken.id);
      throw new ValidationError('Reset token has expired. Please request a new one.');
    }

    const user = await userRepository.findById(resetToken.user_id, 'id, auth_id');
    if (!user || !user.auth_id) throw new AppError('User account configuration error', 500);

    // Update password via Supabase Auth Admin API
    const { error } = await supabase.auth.admin.updateUserById(user.auth_id, {
      password: newPassword,
    });
    if (error) throw new AppError('Failed to reset password', 500);

    await passwordResetRepository.deleteByUserId(resetToken.user_id);

    return { message: 'Password reset successfully. You can now log in with your new password.' };
  },
};
