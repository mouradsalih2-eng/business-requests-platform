# Notifications System — Shaping Notes

## Problem Statement

Users have no way to receive updates about requests they care about. Status changes, new comments, @mentions, and vote milestones go unnoticed unless users manually check.

## Key Decisions

### 1. Notification Types
- **Decision**: Five core notification types
  - `status_change` — Request status updated
  - `new_comment` — New comment on watched request
  - `mention` — @mentioned in a comment
  - `vote_milestone` — Watched request hits vote threshold (10, 25, 50, 100)
  - `watcher_update` — General update on watched request (admin note, merge, etc.)

### 2. Delivery Channels
- **Decision**: In-app + Email (opt-in per type)
  - **In-app**: Always on for all types (bell icon + notification center)
  - **Email**: Opt-in per notification type (off by default, except mentions)
  - **Push**: Future (ties into PWA, F10)

### 3. Notification Center UI
- **Decision**: Bell icon in header + dropdown panel
  - Unread count badge on bell icon
  - Dropdown shows recent notifications (last 50)
  - "Mark all as read" action
  - Click notification → navigate to request
  - Full notification history page (optional)

### 4. User Preferences
- **Decision**: Per-type, per-channel toggles in Settings
  - Matrix: notification type × channel (in-app, email)
  - "Mute all" toggle for temporary silence
  - Digest option for email: immediate, daily summary, weekly summary

### 5. Delivery Mechanism
- **Decision**: Triggered from server on events
  - When a relevant action occurs (status change, comment, etc.), server creates notification records for all watchers
  - In-app: stored in DB, fetched by client on poll/realtime
  - Email: queued and sent via Resend or Supabase email

### 6. @Mention Notifications
- **Decision**: Mentions always notify, even if not watching
  - @mentions are high-priority, always deliver in-app + email (unless explicitly muted)
  - Existing `comment_mentions` table used as trigger source

## Data Model

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  type TEXT NOT NULL CHECK (type IN ('status_change', 'new_comment', 'mention', 'vote_milestone', 'watcher_update')),
  request_id UUID REFERENCES requests(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id),  -- who triggered it
  title TEXT NOT NULL,
  body TEXT,
  data JSONB,                                -- extra context (old_status, new_status, etc.)
  read BOOLEAN DEFAULT false,
  email_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read) WHERE read = false;

CREATE TABLE notification_preferences (
  user_id UUID REFERENCES auth.users(id),
  type TEXT NOT NULL,
  in_app BOOLEAN DEFAULT true,
  email BOOLEAN DEFAULT false,
  email_digest TEXT DEFAULT 'immediate' CHECK (email_digest IN ('immediate', 'daily', 'weekly', 'off')),
  PRIMARY KEY (user_id, type)
);
```

## API Endpoints

- `GET /api/notifications` — List notifications (paginated, filterable by read status)
- `GET /api/notifications/unread-count` — Get unread count (for badge)
- `PATCH /api/notifications/:id/read` — Mark single as read
- `PATCH /api/notifications/read-all` — Mark all as read
- `GET /api/notifications/preferences` — Get user preferences
- `PUT /api/notifications/preferences` — Update user preferences

## Files to Change

### Server
- `server/src/routes/notifications.js` — New route file
- `server/src/services/notifications.js` — Notification creation & delivery logic
- `server/src/routes/requests.js` — Trigger notifications on status change
- `server/src/routes/comments.js` — Trigger notifications on comment/mention
- `server/src/routes/votes.js` — Trigger notifications on vote milestones
- `server/src/index.js` — Mount notification routes

### Client
- `client/src/components/layout/Header.jsx` — Bell icon with unread badge
- `client/src/components/notifications/NotificationCenter.jsx` — Dropdown panel
- `client/src/components/notifications/NotificationItem.jsx` — Single notification display
- `client/src/pages/Settings.jsx` — Notification preferences section
- `client/src/lib/api.js` — Add notification API methods

## Dependencies

- Subscribe/Watch (F7) — watchers list determines who gets notified

## Effort Estimate

Large — Multiple triggers, preference system, email integration, real-time UI
