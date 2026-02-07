# Error Handling

Two layers: route-level try-catch and global error handler.

**Route-level try-catch:**
```js
router.post('/', authenticateToken, async (req, res) => {
  try {
    // Validation
    if (!req.body.title?.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    // Main logic
    const result = db.run('INSERT INTO requests ...', [...]);
    res.status(201).json(result);
  } catch (err) {
    console.error('Create request error:', err);
    res.status(500).json({ error: 'Failed to create request' });
  }
});
```

**Global error handler (last middleware):**
```js
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});
```

**Non-fatal error recovery:**
```js
let mentions = [];
try {
  mentions = processMentions(content);
} catch (mentionErr) {
  console.error('Mention processing error (non-fatal):', mentionErr);
}
res.status(201).json({ ...comment, mentions }); // Continue despite error
```

**Rules:**
- Wrap route handlers in try-catch
- Log errors with context (operation name)
- Return generic message to client (don't expose internals)
- Use global handler as safety net
- Mark non-critical errors as "(non-fatal)" in logs

