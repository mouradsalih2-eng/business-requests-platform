# JWT Authentication Middleware

Extract Bearer token from Authorization header, verify, and attach user to request:

```js
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const user = jwt.verify(token, JWT_SECRET);
    req.user = user;  // Attach to request for downstream handlers
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}
```

**Why distinguish 401 vs 403:** 401 = missing credentials, 403 = invalid credentials.

**Rules:**
- Use Bearer scheme: `Authorization: Bearer <token>`
- Attach decoded payload to `req.user`
- 401 for missing token, 403 for invalid/expired
- JWT_SECRET must be set in production (fail fast if missing)

