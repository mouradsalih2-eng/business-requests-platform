# Release Notes System - Shaping Notes

## Problem Statement

When features move to "Released" status, there's no way to:
- Communicate what was delivered to users
- Provide context on why changes were made
- Build a changelog history
- Notify interested users

## Key Decisions

### 1. Trigger Mechanisms
- **Decision**: Auto-draft on status change + batch releases
- **Auto-draft**: When request status → "Released", draft release note created
- **Batch**: Admin can group multiple requests into single release note
- **Rationale**: Reduce manual work, support both single and grouped releases

### 2. Content Structure
- **Decision**: Structured fields + free-form + images
- **Structured Fields**:
  - **Why**: Problem solved / user need addressed
  - **What**: Feature description
  - **How**: How to use it
  - **Who**: Who it affects (roles, teams)
- **Free-form**: Rich text for additional details
- **Images**: Screenshots, diagrams, GIFs
- **Rationale**: Consistent quality with flexibility

### 3. Distribution Channels

#### Email
- **Audience**: All users (opt-out in preferences)
- **Format**: Summary with link to full note
- **Frequency**: Immediate on publish or digest (weekly)

#### In-App Notification Center
- **Badge**: "New" indicator on releases
- **List**: All release notes, newest first
- **Read state**: Track which user has seen which note

### 4. Draft vs Published
- **Draft**: Auto-created, editable, not distributed
- **Published**: Distributed via email + in-app, versioned
- **Rationale**: Admin review before distribution

### 5. Linking to Requests
- **Decision**: Release note links to source request(s)
- **Display**: "This release addresses: [Request #123]"
- **Rationale**: Traceability, users can see original context

## Data Model

### New Tables
```sql
CREATE TABLE release_notes (
  id INTEGER PRIMARY KEY,
  project_id INTEGER,
  title TEXT NOT NULL,
  version TEXT, -- optional version number
  status TEXT DEFAULT 'draft', -- 'draft', 'published'
  why_content TEXT,
  what_content TEXT,
  how_content TEXT,
  who_content TEXT,
  body_content TEXT, -- free-form rich text
  published_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER
);

CREATE TABLE release_note_requests (
  release_note_id INTEGER,
  request_id INTEGER,
  PRIMARY KEY (release_note_id, request_id)
);

CREATE TABLE release_note_images (
  id INTEGER PRIMARY KEY,
  release_note_id INTEGER,
  image_url TEXT,
  caption TEXT,
  display_order INTEGER
);

CREATE TABLE release_note_reads (
  user_id INTEGER,
  release_note_id INTEGER,
  read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, release_note_id)
);
```

## UI Components

### Admin: Release Note Editor
- Structured field inputs
- Rich text editor for body
- Image upload/gallery
- Request linker (search and attach)
- Preview mode
- Publish button

### Admin: Release Notes List
- All notes with status badge
- Filter by status, date
- Quick publish action

### User: Notification Center
- Bell icon with unread count
- Dropdown/page with release notes
- Mark as read
- Link to full release note page

### User: Release Note Page
- Full content display
- Linked requests
- Share button

## Workflow

### Auto-Draft Flow
1. Admin changes request status to "Released"
2. System creates draft release note
3. Pre-fills: title (from request), what (from request description)
4. Admin edits, adds context
5. Admin publishes

### Batch Release Flow
1. Admin creates new release note
2. Links multiple "Released" requests
3. Writes consolidated release note
4. Publishes

### Publication Flow
1. Admin clicks "Publish"
2. Status → "published", timestamp set
3. Email sent to subscribed users
4. In-app notification created
5. Users see badge on notification icon

## Out of Scope (Future)

- Public changelog page
- RSS feed
- Slack/Teams integration
- Scheduled publishing
- A/B testing release note content
- Analytics (views, clicks)

## Dependencies

- **Required**:
  - Email Verification/Resend (Feature 1) - for email distribution
  - Supabase Migration (Feature 3) - for storage, realtime notifications

## Effort Estimate

Medium-Large - New feature area with editor, notifications, email integration
