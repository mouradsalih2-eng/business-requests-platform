# CSRF Token Handling

CSRF tokens protect against cross-site request forgery.

**Client-side:**
```js
// Token stored in module scope
let csrfToken = null;

// Fetch on app load
fetchCsrfToken();

// Include in state-changing requests
if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
  headers['X-CSRF-Token'] = csrfToken;
}

// Refresh on 403 CSRF error
if (response.status === 403 && error.includes('CSRF')) {
  await fetchCsrfToken();
}
```

**Exceptions:**
- `GET`, `HEAD`, `OPTIONS` - read-only, no CSRF needed
- `/auth/login`, `/auth/register` - no session yet

**Refresh after:**
- Login (new session)
- 403 with CSRF error message
