# Feature Flags System - Applied Standards

## Database Migrations

- Use idempotent migrations with `tableExists()` check
- Location: `server/src/db/database.js` in `runMigrations()`
- Seed default data after table creation

## Authorization

- Use existing `authenticateToken` and `requireAdmin` middleware
- Pattern: `router.patch('/', authenticateToken, requireAdmin, handler)`

## API Organization

- Mount routes under `/api/v1/feature-flags`
- Follow existing route patterns in `server/src/index.js`

## React Context Pattern

- Create provider in `context/` directory
- Export provider, hook (`useFeatureFlag`), and context
- Wrap in `main.jsx` alongside other providers

## Component Pattern

- Toggle component in `components/ui/` directory
- Use existing color tokens (#4F46E5 for primary)
- Support dark mode via dark: variants
