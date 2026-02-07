# Authorization Middleware

Two-level authorization: role-based and resource-level.

**Role-based middleware:**
```js
export function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// Usage: chain after authenticateToken
router.delete('/:id', authenticateToken, requireAdmin, handler);
```

**Resource-level checks in handlers:**
```js
router.patch('/:id', authenticateToken, (req, res) => {
  const request = db.get('SELECT * FROM requests WHERE id = ?', [req.params.id]);
  const isOwner = request.user_id === req.user.id;
  const isAdmin = req.user.role === 'admin';

  if (!isOwner && !isAdmin) {
    return res.status(403).json({ error: 'Not authorized' });
  }
  // proceed...
});
```

**Why both levels:** Role middleware for admin-only routes, inline checks for owner-or-admin logic.

**Rules:**
- `requireAdmin` middleware for admin-only endpoints
- Inline checks for "owner or admin" logic
- Prevent self-modification (can't change own role, can't delete self)
- Always 403 for authorization failures

