# API Client Organization

All API methods live in `lib/api.js`, grouped by resource:

```js
// lib/api.js
export const auth = {
  login: (email, password) => request('/auth/login', { ... }),
  me: () => request('/auth/me'),
};

export const requests = {
  getAll: (params) => request('/requests', { ... }),
  create: (data) => request('/requests', { method: 'POST', ... }),
};

export const votes = { ... };
export const comments = { ... };
```

**Why single file:** Simpler imports - one import instead of many.

```js
// Usage
import { auth, requests } from '../lib/api';
await auth.login(email, password);
await requests.getAll();
```

**Rules:**
- Group by REST resource
- Name methods after action: `getAll`, `getOne`, `create`, `update`, `delete`
- Keep `request()` helper private (not exported)
