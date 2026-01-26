# Feature Flags System - Implementation Plan

Admin-controlled feature flags to toggle platform features on/off for MVP testing.

## Overview

Build a feature flag system that allows admins to enable/disable features from the AdminPanel. Features can be turned off to test the core experience or gradually rolled out.

**Features to control:**
- `roadmap_kanban` - Roadmap Kanban board view (also controls request-roadmap sync)
- `request_merging` - Merge duplicate requests
- `duplicate_detection` - Suggest similar requests on create

## Database Schema

```sql
CREATE TABLE feature_flags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  enabled INTEGER DEFAULT 1,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

## API Endpoints

- `GET /api/v1/feature-flags` - Get all flags (public)
- `PATCH /api/v1/feature-flags/:name` - Toggle flag (admin only)

## Implementation Tasks

1. Database migration for feature_flags table
2. Backend API routes (server/src/routes/feature-flags.js)
3. Client API methods (client/src/lib/api.js)
4. Toggle component (client/src/components/ui/Toggle.jsx)
5. Feature Flag Context (client/src/context/FeatureFlagContext.jsx)
6. AdminPanel integration (Feature Flags tab)
7. Wrap existing features with flag checks

## Verification Checklist

- [ ] feature_flags table created with 3 default flags
- [ ] GET /api/v1/feature-flags returns all flags
- [ ] PATCH requires admin auth (403 for non-admin)
- [ ] Admin UI toggle persists on page refresh
- [ ] Disable roadmap_kanban hides Roadmap tab and blocks API
- [ ] Disable duplicate_detection stops suggestions on request form
- [ ] Disable request_merging hides merge option in RequestDetail
