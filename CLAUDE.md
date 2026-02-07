# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Business Requests Platform - A full-stack web application for submitting, tracking, and managing business feature requests with voting, commenting, and admin approval workflows.

**Requirements:** Node.js >= 18.0.0

## Commands

### Development
```bash
# Start server (port 3001, with hot reload via --watch)
cd server && npm run dev

# Start client (Vite dev server on port 5173, proxies /api to :3001)
cd client && npm run dev
```

### Testing
```bash
# Run all tests (server + client)
npm test

# Server tests only (Jest with ES modules)
cd server && npm test

# Client tests only (Vitest)
cd client && npm test

# Client tests in watch mode
cd client && npm run test:watch

# Run a single server test file
cd server && node --experimental-vm-modules node_modules/jest/bin/jest.js __tests__/auth.test.js

# Run a single client test file
cd client && npx vitest run src/__tests__/api.test.js

# E2E tests (requires both server and client running)
npm run test:e2e
npm run test:e2e:headed    # visible browser
npm run test:e2e:ui        # interactive UI mode
```

### Migrations
```bash
# Show migration status
cd server && node src/db/migrate.js status

# Apply all pending migrations
cd server && node src/db/migrate.js up

# Apply up to a specific version
cd server && node src/db/migrate.js up 002

# Revert last applied migration
cd server && node src/db/migrate.js down

# Revert down to a specific version
cd server && node src/db/migrate.js down 001
```

### Build & Production
```bash
npm run build    # Install deps + build client
npm start        # Start production server (serves client from /client/dist)
```

## Architecture

### Monorepo Structure
- `/client` - React SPA (Vite, React Router, Tailwind CSS, React Query)
- `/server` - Express API (Node.js, SQL.js for SQLite, Zod validation)
- Both use ES modules (`"type": "module"`)

### Server (`/server/src`)
- `index.js` - Express app setup, middleware config, route mounting
- `routes/` - REST API endpoints (auth, requests, votes, comments, users, feature-flags, roadmap)
- `middleware/auth.js` - JWT authentication (`authenticateToken`) and admin authorization (`requireAdmin`)
- `middleware/csrf.js` - CSRF token generation and validation (bypassed for JWT-authenticated requests)
- `middleware/validate.js` - Zod schema validation helpers: `validateBody()`, `validateQuery()`, `validateParams()`
- `db/database.js` - SQL.js wrapper with `run()`, `get()`, `all()` helpers; handles schema init and migrations on startup
- `db/schema.sql` - Full database schema
- `services/email.js` - Email verification via nodemailer (codes logged to console when SMTP not configured)
- `services/storageService.js` - Supabase Storage helpers: `uploadAvatar()`, `deleteAvatar()`, `uploadAttachment()`, `deleteAttachments()`
- `db/migrationRunner.js` - Programmatic migration runner with versioning (tracks applied migrations in `schema_migrations` table)
- `db/migrate.js` - CLI entry point: `node src/db/migrate.js up|down|status`
- `validation/schemas.js` - All Zod schemas for request validation

### Client (`/client/src`)
- `App.jsx` - Route definitions with `ProtectedRoute` and `PublicRoute` wrappers
- `context/AuthContext.jsx` - Authentication state provider with `useAuth()` hook
- `context/FeatureFlagContext.jsx` - Feature flag provider with `useFeatureFlag(name)` hook
- `lib/api.js` - API client with auth token handling (exports: `auth`, `requests`, `votes`, `comments`, `users`, `registration`, `roadmap`, `featureFlags`)
- `components/` - UI components organized by feature (layout, requests, social, ui, auth, settings)
- `pages/` - Route page components (Dashboard, Login, Register, NewRequest, MyRequests, AdminPanel, Settings)

### Database
SQL.js (SQLite compiled to WASM) with file persistence at `server/data.db`. Schema defined in `server/src/db/schema.sql`.

**DB wrapper return values:**
- `run(sql, params)` - Returns `{ lastInsertRowid }` after inserts; saves DB to file after every write
- `get(sql, params)` - Returns single row object or `undefined`
- `all(sql, params)` - Returns array of row objects

**Enum constraints enforced at DB level:**
- `role`: employee, admin
- `category`: bug, new_feature, optimization
- `priority`: low, medium, high
- `status`: pending, backlog, in_progress, completed, rejected, duplicate, archived
- `team`: Manufacturing, Sales, Service, Energy
- `region`: EMEA, North America, APAC, Global

**Migrations:** Versioned SQL migrations in `server/supabase/migrations/<NNN_name>/up.sql` and `down.sql`. Tracked in `schema_migrations` table. CLI: `node src/db/migrate.js up|down|status`. Uses `exec_sql` RPC for DDL execution.

### Route Mounting
Routes are mounted at **both** `/api/v1/*` and `/api/*` (legacy compatibility) using separate router instances to avoid middleware duplication.

### Route Ordering Gotcha
In route files, define named routes **before** `:id` parameterized routes to avoid conflicts (e.g., `/stats/analytics` before `/:id`, `/search` before `/:id`).

### Authentication Flow
1. JWT tokens stored in localStorage
2. `AuthContext` checks token validity on mount via `/api/auth/me`
3. API client (`lib/api.js`) automatically attaches Bearer token
4. Server middleware validates JWT and attaches `req.user`
5. Admin routes use `requireAdmin` middleware
6. Registration is disabled by default; admins create new users

### Key Patterns
- **Vite proxy** forwards `/api` requests to `http://localhost:3001` in dev
- **API base URL** configurable via `VITE_API_URL` env var (defaults to `/api`)
- **Production** serves client static files from server with SPA fallback for client-side routing
- **Husky pre-commit hook** runs `npm test` before every commit
- **Rate limiting**: 500 req/15min general, 10 req/15min auth (prod, 100 in dev), 5 req/15min password reset
- **Feature flags**: Admin-controlled toggles stored in DB; default to enabled if flag doesn't exist. Current flags: `roadmap_kanban`, `request_merging`, `duplicate_detection`
- **File uploads**: Multer `memoryStorage()` parses uploads, then `storageService` uploads to Supabase Storage buckets (`avatars`, `attachments`). DB stores full public URLs.
- **E2E tests**: Playwright with Chromium, Firefox, WebKit, and mobile Chrome (Pixel 5); servers must be running manually
- **Dark mode**: Tailwind `darkMode: 'class'`; all theme colors use CSS custom properties (`--bg-primary`, `--text-primary`, `--accent`, etc.)
- **Roadmap sync**: Requests auto-appear in roadmap as synced items. Can be promoted to full roadmap items. Status maps: pending→backlog, in_progress→in_progress, completed→released
- **Request merging**: Sets `merged_into_id` and status to `duplicate`; optionally transfers votes (default true) and comments (default false)
- **Comment @mentions**: Regex `/@(\w+(?:\s+\w+)?)/g` matched against user names, stored in `comment_mentions` table
- **Activity log**: Tracks admin actions (status changes, merges) with old/new values in `activity_log` table
- **Seeding**: `POST /api/users/seed` (admin only) creates 10 test users + 115 requests with votes, comments, and tags

### Test Patterns

**Server tests** (Jest + ES modules): Must use `jest.unstable_mockModule` **before** dynamic imports:
```javascript
jest.unstable_mockModule('../src/db/database.js', () => ({
  run: jest.fn(), get: jest.fn(), all: jest.fn()
}));
const { default: authRoutes } = await import('../src/routes/auth.js');
```

**Client tests** (Vitest + jsdom): `setupTests.js` mocks `localStorage` and `fetch` globally and auto-clears before each test.

### Environment Variables (Server)
- `PORT` - Server port (default: 3001)
- `JWT_SECRET` - Required in production (auto-generated in dev with warning)
- `CLIENT_URL` - Client URL for CORS (default: http://localhost:5173)
- `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_FROM` - Email config (optional; codes log to console if not set)

### Test Credentials
See `TEST_USERS.md`. Quick reference: admin@company.com / admin123, employees use password123.
