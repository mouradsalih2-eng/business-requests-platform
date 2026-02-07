const requiredInProduction = (name, fallback) => {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === 'production') {
    console.error(`FATAL: ${name} must be set in production`);
    process.exit(1);
  }
  if (!value && fallback !== undefined) {
    console.warn(`WARNING: ${name} not set. Using fallback.`);
    return fallback;
  }
  return value;
};

export const config = {
  port: parseInt(process.env.PORT, 10) || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV !== 'production',

  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serviceKey: process.env.SUPABASE_SERVICE_KEY || '',
    jwtSecret: process.env.SUPABASE_JWT_SECRET || '',
  },

  // jwt.secret is no longer used — Supabase Auth manages tokens.
  // SUPABASE_JWT_SECRET is used instead (see supabase.jwtSecret above).

  client: {
    url: process.env.CLIENT_URL || 'http://localhost:5173',
  },

  smtp: {
    host: process.env.SMTP_HOST,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    from: process.env.SMTP_FROM,
  },

  rateLimit: {
    general: { windowMs: 15 * 60 * 1000, max: 500 },
    auth: { windowMs: 15 * 60 * 1000, max: process.env.NODE_ENV === 'production' ? 10 : 100 },
    passwordReset: { windowMs: 15 * 60 * 1000, max: 5 },
  },

  upload: {
    maxFileSize: 10 * 1024 * 1024,
    maxAvatarSize: 5 * 1024 * 1024,
    maxAttachments: 5,
  },
};
