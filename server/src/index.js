import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

import { config } from './config/index.js';
import { supabase } from './db/supabase.js';
import { errorHandler } from './middleware/errorHandler.js';
import { csrfProvider, csrfProtection } from './middleware/csrf.js';

import authRoutes from './routes/auth.js';
import requestsRoutes from './routes/requests.js';
import votesRoutes from './routes/votes.js';
import commentsRoutes from './routes/comments.js';
import usersRoutes from './routes/users.js';
import roadmapRoutes from './routes/roadmap.js';
import featureFlagsRoutes from './routes/feature-flags.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Trust proxy — required for Railway/Heroku
app.set('trust proxy', 1);

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// Rate limiting
const generalLimiter = rateLimit({
  ...config.rateLimit.general,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  ...config.rateLimit.auth,
  message: { error: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const passwordResetLimiter = rateLimit({
  ...config.rateLimit.passwordReset,
  message: { error: 'Too many password reset attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// CORS
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  config.client.url,
].filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (config.isProduction) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  exposedHeaders: ['X-CSRF-Token'],
}));

app.use(generalLimiter);
app.use(express.json({ limit: '1mb' }));
app.use(csrfProvider);

// Serve client static files in production
if (config.isProduction) {
  const clientPath = join(__dirname, '../../client/dist');
  if (fs.existsSync(clientPath)) {
    app.use(express.static(clientPath));
  } else {
    console.warn('WARNING: Client dist folder not found!');
  }
}

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.get('/api/v1/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// CSRF token endpoint
app.get('/api/csrf-token', (_req, res) => res.json({ csrfToken: res.getCsrfToken() }));
app.get('/api/v1/csrf-token', (_req, res) => res.json({ csrfToken: res.getCsrfToken() }));

// Root health check
app.get('/', (req, res, next) => {
  if (config.isProduction) return next();
  res.json({ status: 'ok', message: 'API is running' });
});

// ── Mount API routes ─────────────────────────────────────────

function createApiRouter() {
  const router = express.Router();
  router.use(csrfProtection);
  router.use('/auth', authLimiter, authRoutes);
  router.use('/requests', requestsRoutes);
  router.use('/requests', votesRoutes);
  router.use('/requests', commentsRoutes);
  router.use('/comments', commentsRoutes);
  router.use('/users', usersRoutes);
  router.use('/roadmap', roadmapRoutes);
  router.use('/feature-flags', featureFlagsRoutes);
  return router;
}

app.use('/api/v1', createApiRouter());
app.use('/api', createApiRouter());

// Password reset rate limiting
app.use('/api/v1/auth/forgot-password', passwordResetLimiter);
app.use('/api/v1/auth/reset-password', passwordResetLimiter);
app.use('/api/auth/forgot-password', passwordResetLimiter);
app.use('/api/auth/reset-password', passwordResetLimiter);

// SPA fallback in production
if (config.isProduction) {
  const indexPath = join(__dirname, '../../client/dist/index.html');
  const indexExists = fs.existsSync(indexPath);

  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      if (indexExists) {
        res.sendFile(indexPath);
      } else {
        res.status(200).send('<html><body><h1>API Server Running</h1><p>Client build not found.</p></body></html>');
      }
    }
  });
}

// Centralized error handler — must be last
app.use(errorHandler);

// ── Start server ─────────────────────────────────────────────

async function start() {
  try {
    // Verify Supabase connectivity
    const { error } = await supabase.from('feature_flags').select('name').limit(1);
    if (error) {
      console.error('Supabase connection check failed:', error.message);
      console.error('Ensure your Supabase schema has been set up (see server/supabase/migrations/).');
      process.exit(1);
    }
    console.log('Supabase connection verified');

    app.listen(config.port, '0.0.0.0', () => {
      console.log(`Server running on port ${config.port}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
