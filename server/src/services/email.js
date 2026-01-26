import nodemailer from 'nodemailer';

// Configure nodemailer transporter
const createTransporter = () => {
  // Check if SMTP is configured
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('SMTP not configured. Email functionality will be disabled.');
    console.warn('Set SMTP_HOST, SMTP_USER, SMTP_PASS, and optionally SMTP_PORT and SMTP_FROM environment variables.');
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

let transporter = null;

// Initialize transporter lazily
const getTransporter = () => {
  if (!transporter) {
    transporter = createTransporter();
  }
  return transporter;
};

// Generate a 6-digit numeric verification code
export function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Get expiration time (15 minutes from now)
export function getCodeExpiration() {
  return new Date(Date.now() + 15 * 60 * 1000).toISOString();
}

// Email templates
const emailTemplates = {
  registration: (code) => ({
    subject: 'Verify your email - Business Requests Platform',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #171717; font-size: 24px; font-weight: 600; margin-bottom: 24px;">Verify your email</h1>
        <p style="color: #525252; font-size: 16px; line-height: 1.5; margin-bottom: 24px;">
          Thank you for registering! Please use the verification code below to complete your registration:
        </p>
        <div style="background-color: #F5F5F5; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #171717;">${code}</span>
        </div>
        <p style="color: #737373; font-size: 14px; line-height: 1.5;">
          This code will expire in 15 minutes. If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `,
    text: `Verify your email\n\nThank you for registering! Your verification code is: ${code}\n\nThis code will expire in 15 minutes. If you didn't request this, you can safely ignore this email.`,
  }),

  passwordChange: (code) => ({
    subject: 'Password change verification - Business Requests Platform',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #171717; font-size: 24px; font-weight: 600; margin-bottom: 24px;">Password change request</h1>
        <p style="color: #525252; font-size: 16px; line-height: 1.5; margin-bottom: 24px;">
          You requested to change your password. Please use the verification code below to confirm:
        </p>
        <div style="background-color: #F5F5F5; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #171717;">${code}</span>
        </div>
        <p style="color: #737373; font-size: 14px; line-height: 1.5;">
          This code will expire in 15 minutes. If you didn't request this password change, please secure your account immediately.
        </p>
      </div>
    `,
    text: `Password change request\n\nYou requested to change your password. Your verification code is: ${code}\n\nThis code will expire in 15 minutes. If you didn't request this password change, please secure your account immediately.`,
  }),

  passwordReset: (resetLink, name) => ({
    subject: 'Reset your password - Business Requests Platform',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #171717; font-size: 24px; font-weight: 600; margin-bottom: 24px;">Reset your password</h1>
        <p style="color: #525252; font-size: 16px; line-height: 1.5; margin-bottom: 24px;">
          Hi${name ? ` ${name}` : ''},
        </p>
        <p style="color: #525252; font-size: 16px; line-height: 1.5; margin-bottom: 24px;">
          We received a request to reset your password. Click the button below to choose a new password:
        </p>
        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${resetLink}" style="display: inline-block; background-color: #171717; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 500;">
            Reset Password
          </a>
        </div>
        <p style="color: #737373; font-size: 14px; line-height: 1.5; margin-bottom: 16px;">
          Or copy and paste this link into your browser:
        </p>
        <p style="color: #3B82F6; font-size: 14px; line-height: 1.5; word-break: break-all; margin-bottom: 24px;">
          ${resetLink}
        </p>
        <p style="color: #737373; font-size: 14px; line-height: 1.5;">
          This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `,
    text: `Reset your password\n\nHi${name ? ` ${name}` : ''},\n\nWe received a request to reset your password. Click the link below to choose a new password:\n\n${resetLink}\n\nThis link will expire in 1 hour. If you didn't request this, you can safely ignore this email.`,
  }),
};

// Send verification email
export async function sendVerificationEmail(email, code, type) {
  const transport = getTransporter();

  if (!transport) {
    // In development without SMTP, log the code
    console.log(`[DEV] Verification code for ${email}: ${code}`);
    return { success: true, dev: true };
  }

  const template = type === 'registration'
    ? emailTemplates.registration(code)
    : emailTemplates.passwordChange(code);

  try {
    await transport.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to send email:', error);
    throw new Error('Failed to send verification email');
  }
}

// Send password reset email
export async function sendPasswordResetEmail(email, token, name) {
  const transport = getTransporter();

  // Build reset link
  const baseUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const resetLink = `${baseUrl}/reset-password?token=${token}`;

  if (!transport) {
    // In development without SMTP, log the link
    console.log(`[DEV] Password reset link for ${email}: ${resetLink}`);
    return { success: true, dev: true };
  }

  const template = emailTemplates.passwordReset(resetLink, name);

  try {
    await transport.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
}

// Verify SMTP connection on startup
export async function verifyEmailConnection() {
  const transport = getTransporter();

  if (!transport) {
    return { configured: false };
  }

  try {
    await transport.verify();
    console.log('SMTP connection verified successfully');
    return { configured: true, connected: true };
  } catch (error) {
    console.error('SMTP connection failed:', error.message);
    return { configured: true, connected: false, error: error.message };
  }
}
