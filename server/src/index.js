import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { initializeDatabase } from './db/database.js';
import authRoutes from './routes/auth.js';
import requestsRoutes from './routes/requests.js';
import votesRoutes from './routes/votes.js';
import commentsRoutes from './routes/comments.js';
import usersRoutes from './routes/users.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow file uploads to be accessed
}));

// Rate limiting - general API limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // limit each IP to 500 requests per windowMs
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 10 : 100, // stricter in production
  message: { error: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// CORS configuration - restrict to known origins
const allowedOrigins = [
  'http://localhost:5173',      // Vite dev server
  'http://localhost:3000',      // Alternate dev
  'http://127.0.0.1:5173',
  process.env.CLIENT_URL,       // Production client URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Apply general rate limiting to all requests
app.use(generalLimiter);

// JSON parsing with size limit
app.use(express.json({ limit: '1mb' }));

// Serve uploaded files
app.use('/uploads', express.static(join(__dirname, '../uploads')));

// Serve client static files in production
if (process.env.NODE_ENV === 'production') {
  const fs = require('fs');
  const clientPath = join(__dirname, '../../client/dist');
  console.log('Client path:', clientPath);
  console.log('Client path exists:', fs.existsSync(clientPath));
  if (fs.existsSync(clientPath)) {
    console.log('Client files:', fs.readdirSync(clientPath));
    app.use(express.static(clientPath));
  } else {
    console.log('WARNING: Client dist folder not found!');
  }
}

// Health check - Railway uses this to verify the app is running
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root health check for Railway (responds before SPA fallback)
app.get('/', (req, res, next) => {
  // If in production and client files exist, let the static middleware handle it
  if (process.env.NODE_ENV === 'production') {
    return next();
  }
  res.json({ status: 'ok', message: 'API is running' });
});

// Debug endpoint (only in production for troubleshooting)
app.get('/api/debug', (req, res) => {
  const fs = require('fs');
  const clientPath = join(__dirname, '../../client/dist');
  const indexPath = join(clientPath, 'index.html');
  res.json({
    __dirname,
    cwd: process.cwd(),
    clientPath,
    indexExists: fs.existsSync(indexPath),
    clientDirExists: fs.existsSync(clientPath),
    clientFiles: fs.existsSync(clientPath) ? fs.readdirSync(clientPath) : [],
  });
});

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/requests', requestsRoutes);
app.use('/api/requests', votesRoutes);
app.use('/api/requests', commentsRoutes);
app.use('/api/comments', commentsRoutes);
app.use('/api/users', usersRoutes);

// Serve client app for all non-API routes in production (SPA fallback)
if (process.env.NODE_ENV === 'production') {
  const fs = require('fs');
  const indexPath = join(__dirname, '../../client/dist/index.html');
  const indexExists = fs.existsSync(indexPath);
  console.log('Index.html path:', indexPath);
  console.log('Index.html exists:', indexExists);

  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      if (indexExists) {
        res.sendFile(indexPath);
      } else {
        res.status(200).send(`
          <html>
            <body>
              <h1>API Server Running</h1>
              <p>Client build not found. The API is working at <a href="/api/health">/api/health</a></p>
            </body>
          </html>
        `);
      }
    }
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize database and start server
async function start() {
  try {
    await initializeDatabase();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
