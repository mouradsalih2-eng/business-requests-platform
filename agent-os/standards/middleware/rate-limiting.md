# Rate Limiting

Tiered rate limits by endpoint sensitivity:

```js
import rateLimit from 'express-rate-limit';

// General API - permissive
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 500,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth endpoints - stricter
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 10 : 100,
  message: { error: 'Too many login attempts, please try again later' },
});

// Password reset - very strict
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many password reset attempts' },
});

// Apply
app.use(generalLimiter);
v1Router.use('/auth', authLimiter, authRoutes);
app.use('/api/v1/auth/forgot-password', passwordResetLimiter);
```

**Why tiered:** Sensitive endpoints need stronger protection against brute force.

**Rules:**
- General API: 500 req/15min
- Auth: 10 req/15min (prod), 100 req/15min (dev for testing)
- Password reset: 5 req/15min
- Use `standardHeaders: true` for `RateLimit-*` response headers
- Set `app.set('trust proxy', 1)` for deployments behind proxy

