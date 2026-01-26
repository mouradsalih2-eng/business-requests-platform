import crypto from 'crypto';

// In-memory token store (in production, use Redis or similar)
const tokenStore = new Map();

// Token expiry time (1 hour)
const TOKEN_EXPIRY = 60 * 60 * 1000;

// Clean up expired tokens periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of tokenStore.entries()) {
    if (value.expires < now) {
      tokenStore.delete(key);
    }
  }
}, 5 * 60 * 1000); // Clean every 5 minutes

/**
 * Generate a CSRF token for a user session
 */
export function generateCsrfToken(sessionId) {
  const token = crypto.randomBytes(32).toString('hex');
  tokenStore.set(sessionId, {
    token,
    expires: Date.now() + TOKEN_EXPIRY,
  });
  return token;
}

/**
 * Validate a CSRF token
 */
export function validateCsrfToken(sessionId, token) {
  const stored = tokenStore.get(sessionId);
  if (!stored) return false;
  if (stored.expires < Date.now()) {
    tokenStore.delete(sessionId);
    return false;
  }
  return stored.token === token;
}

/**
 * Get or create session ID from request
 */
function getSessionId(req) {
  // Use user ID if authenticated, otherwise use a combination of IP and user agent
  if (req.user?.id) {
    return `user:${req.user.id}`;
  }
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'] || 'unknown';
  return `anon:${crypto.createHash('sha256').update(`${ip}:${userAgent}`).digest('hex').slice(0, 16)}`;
}

/**
 * Middleware to provide CSRF token
 * Adds getCsrfToken() method to response
 */
export function csrfProvider(req, res, next) {
  const sessionId = getSessionId(req);

  res.getCsrfToken = () => {
    return generateCsrfToken(sessionId);
  };

  // Store session ID for validation middleware
  req.csrfSessionId = sessionId;

  next();
}

/**
 * Middleware to validate CSRF token on state-changing requests
 */
export function csrfProtection(req, res, next) {
  // Skip for GET, HEAD, OPTIONS requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Skip CSRF validation in test environment
  if (process.env.NODE_ENV === 'test') {
    return next();
  }

  // Skip CSRF for auth endpoints that don't require prior authentication
  const authExemptPaths = [
    '/auth/login',
    '/auth/register',
    '/auth/register/initiate',
    '/auth/register/verify',
    '/auth/register/resend',
    '/auth/forgot-password',
    '/auth/reset-password',
  ];

  const requestPath = req.path;
  if (authExemptPaths.some(path => requestPath.endsWith(path))) {
    return next();
  }

  const token = req.headers['x-csrf-token'];
  const sessionId = req.csrfSessionId || getSessionId(req);

  // If there's no token but user is JWT authenticated, allow the request
  // JWT already provides protection against CSRF for API requests
  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    return next();
  }

  if (!token) {
    return res.status(403).json({ error: 'CSRF token missing' });
  }

  if (!validateCsrfToken(sessionId, token)) {
    // If validation fails but user has valid JWT, allow the request
    // This handles cases where token expired or session ID changed
    if (req.headers.authorization?.startsWith('Bearer ')) {
      return next();
    }
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }

  next();
}

export default { csrfProvider, csrfProtection, generateCsrfToken };
