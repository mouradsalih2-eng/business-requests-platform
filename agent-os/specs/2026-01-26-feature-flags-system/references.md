# Feature Flags System - References

## Existing Patterns

### Settings Pattern
- File: `client/src/pages/Settings.jsx`
- Pattern: User preferences stored in DB, fetched on load
- API: `users.getSettings()`, `users.updateSettings()`

### AdminPanel Tabs
- File: `client/src/pages/AdminPanel.jsx`
- Pattern: Tab state with activeTab, conditional rendering
- Tabs: requests, analytics, users (add flags)

### Database Migrations
- File: `server/src/db/database.js`
- Function: `runMigrations()`
- Pattern: `if (!tableExists('name')) { db.run(CREATE TABLE...) }`

### Auth Middleware
- File: `server/src/middleware/auth.js`
- Exports: `authenticateToken`, `requireAdmin`

### API Client
- File: `client/src/lib/api.js`
- Pattern: Export object with methods calling `request()`
- Example: `export const users = { getAll: () => request('/users'), ... }`

## Critical Files to Modify

| File | Change |
|------|--------|
| server/src/db/database.js | Add migration |
| server/src/index.js | Mount routes |
| client/src/lib/api.js | Add featureFlags |
| client/src/main.jsx | Add provider |
| client/src/pages/AdminPanel.jsx | Add tab |
| client/src/pages/Dashboard.jsx | Wrap roadmap |
| client/src/components/requests/RequestForm.jsx | Wrap duplicate detection |
| client/src/components/requests/RequestDetail.jsx | Wrap merging |
| server/src/routes/roadmap.js | Add middleware |
