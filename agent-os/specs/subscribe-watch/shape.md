# Subscribe/Watch Requests — Shaping Notes

## Problem Statement

Users have no way to track updates on requests they care about. They must manually check for status changes, new comments, or vote milestones.

## Key Decisions

### 1. Watch Model
- **Decision**: Per-request subscription with configurable auto-subscribe
- `request_watchers` table tracks who watches what
- Explicit subscribe/unsubscribe toggle on request detail

### 2. Auto-Subscribe Rules
- **Decision**: Auto-subscribe on interaction (configurable per user)
- Auto-subscribe when you:
  - Create a request
  - Comment on a request
  - Vote on a request (optional, user preference)
- Users can turn off auto-subscribe in Settings

### 3. UI
- **Decision**: Watch button on request detail + "Watching" filter
- Eye icon toggle on request detail page
- "Watching" tab/filter in My Requests page
- Watcher count visible on request detail (not cards)

### 4. Foundation for Notifications
- **Decision**: Watch list is the source for notification delivery
- When an event happens on a request, all watchers get notified (F8)
- Without F8, watching still provides the "Watching" filter

## Data Model

```sql
CREATE TABLE request_watchers (
  user_id INTEGER REFERENCES users(id),
  request_id INTEGER REFERENCES requests(id) ON DELETE CASCADE,
  auto_subscribed BOOLEAN DEFAULT false, -- true if auto-added
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, request_id)
);

-- User preference for auto-subscribe behavior
-- (can be added to existing user_preferences or settings)
ALTER TABLE users ADD COLUMN auto_watch_on_comment BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN auto_watch_on_vote BOOLEAN DEFAULT false;
```

## API Endpoints

- `POST /api/requests/:id/watch` — Subscribe to request
- `DELETE /api/requests/:id/watch` — Unsubscribe from request
- `GET /api/requests/:id/watchers` — List watchers (admin)
- `GET /api/requests/watching` — Get user's watched requests

## Files to Change

### Server
- `server/src/routes/requests.js` — Add watch/unwatch endpoints
- `server/src/db/schema.sql` — Add `request_watchers` table

### Client
- `client/src/components/requests/RequestDetail.jsx` — Add watch toggle
- `client/src/pages/MyRequests.jsx` — Add "Watching" filter tab
- `client/src/pages/Settings.jsx` — Add auto-subscribe preferences
- `client/src/lib/api.js` — Add watch API methods

## Dependencies

None

## Effort Estimate

Medium — New table, endpoints, UI toggle, filter integration
