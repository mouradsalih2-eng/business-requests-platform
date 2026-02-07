# Migrations

Migrations run on every server start. Must be idempotent.

**Adding a column:**
```js
if (!columnExists('users', 'profile_picture')) {
  db.run('ALTER TABLE users ADD COLUMN profile_picture TEXT');
}
```

**Adding a table:**
```js
if (!tableExists('activity_log')) {
  db.run(`CREATE TABLE activity_log (...)`);
}
```

**Why idempotent:** Migrations can run multiple times safely without errors.

**Rules:**
- Always check existence before CREATE/ALTER
- Use `tableExists()` and `columnExists()` helpers
- Never drop columns/tables in migrations
- Log migration actions with `console.log()`
