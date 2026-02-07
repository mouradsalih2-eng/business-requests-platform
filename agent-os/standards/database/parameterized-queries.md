# Parameterized Queries

Always use `?` placeholders for user input, never string interpolation:

```js
// CORRECT - parameterized
const user = get('SELECT * FROM users WHERE id = ?', [userId]);
run('INSERT INTO requests (title, user_id) VALUES (?, ?)', [title, userId]);

// WRONG - string interpolation (SQL injection risk)
const user = get(`SELECT * FROM users WHERE id = ${userId}`);
```

**Why:** Prevents SQL injection attacks. User input is never executed as SQL code.

**Rules:**
- Use `?` for all dynamic values
- Pass values as array in second argument
- Never use template literals or string concatenation for SQL
- Order of `?` must match order in array

