# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Business Requests Platform - A full-stack web application for submitting, tracking, and managing business feature requests with voting, commenting, and admin approval workflows.

**Requirements:** Node.js >= 18.0.0

## Commands

### Development
```bash
# Start server (with hot reload)
cd server && npm run dev

# Start client (Vite dev server on port 5173)
cd client && npm run dev
```

### Testing
```bash
# Run all tests
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
```

### Build & Production
```bash
# Build client and install all dependencies
npm run build

# Start production server
npm start
```

## Architecture

### Monorepo Structure
- `/client` - React SPA (Vite, React Router, Tailwind CSS)
- `/server` - Express API (Node.js, SQL.js for SQLite in-memory/file persistence)

### Server (`/server/src`)
- `index.js` - Express app setup, middleware config, route mounting
- `routes/` - REST API endpoints (auth, requests, votes, comments, users)
- `middleware/auth.js` - JWT authentication and admin authorization
- `db/database.js` - SQL.js wrapper with `run()`, `get()`, `all()` helpers
- `services/email.js` - Email verification via nodemailer

### Client (`/client/src`)
- `App.jsx` - Route definitions with `ProtectedRoute` and `PublicRoute` wrappers
- `context/AuthContext.jsx` - Authentication state provider with `useAuth()` hook
- `lib/api.js` - API client with auth token handling (exports: `auth`, `requests`, `votes`, `comments`, `users`, `registration`)
- `components/` - UI components organized by feature (layout, requests, social, ui, auth, settings)
- `pages/` - Route page components (Dashboard, Login, Register, NewRequest, MyRequests, AdminPanel, Settings)

### Database
Uses SQL.js (SQLite compiled to WebAssembly) with file persistence at `server/data.db`. Schema includes:
- `users` - Authentication with roles (user/admin)
- `requests` - Business requests with status, category, priority, team, region
- `votes` - Upvotes and likes per request
- `comments` - Threaded comments with @mentions
- `attachments` - File uploads for requests
- `activity_log` - Admin action tracking

### Authentication Flow
1. JWT tokens stored in localStorage
2. `AuthContext` checks token validity on mount via `/api/auth/me`
3. API client (`lib/api.js`) automatically attaches Bearer token
4. Server middleware validates JWT and attaches `req.user`
5. Admin routes use `requireAdmin` middleware

### Key Patterns
- Server tests mock the database module with `jest.unstable_mockModule`
- Client tests use Vitest with jsdom and mock localStorage/fetch in `setupTests.js`
- API base URL configurable via `VITE_API_URL` env var (defaults to `/api`)
- Production build serves client static files from server with SPA fallback
- Husky pre-commit hook runs `npm test` before every commit
- Test credentials for development are in `TEST_USERS.md`
