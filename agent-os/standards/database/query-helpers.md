# Query Helpers

Use the appropriate helper based on expected result:

```js
import { run, get, all } from './db/database.js';

// INSERT, UPDATE, DELETE - returns { lastInsertRowid }
run('INSERT INTO users (name) VALUES (?)', [name]);

// Single row - returns object or null
const user = get('SELECT * FROM users WHERE id = ?', [id]);

// Multiple rows - returns array (empty if none)
const users = all('SELECT * FROM users WHERE role = ?', [role]);
```

**Why separate methods:** Return type clarity - each method has predictable output.

| Method | Returns | Use for |
|--------|---------|----------|
| `run` | `{ lastInsertRowid }` | INSERT, UPDATE, DELETE |
| `get` | `object \| null` | Single row lookups |
| `all` | `array` | Multiple rows |
