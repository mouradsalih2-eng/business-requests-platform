# Product Roadmap

## Status Legend

| Status | Meaning |
|--------|---------|
| Done | Shipped and live |
| In Progress | Currently being built |
| Planned | Scoped and ready to build |
| Future | Defined but not yet scheduled |

---

## Phase 1: MVP — Done

Core functionality for first usable version.

### Request Submission & Management — Done
- Users submit feature requests with title, description, category, priority
- View and filter requests by status, category, team, region
- Search functionality to find existing requests
- File attachments support

### Voting & Engagement — Done
- Upvote system to signal demand
- Like system for softer endorsement
- Comment threads with @mentions
- Vote counts and engagement visibility

### Admin Controls — Done
- Status management (pending, backlog, in progress, completed, rejected, duplicate)
- Approval workflow for new requests
- Activity log tracking all admin actions
- Request deletion and editing capabilities

### Authentication & Access — Done
- User registration and login
- Role-based access (user vs admin)
- Session management
- Profile settings

### Analytics (Admin) — Done
- Dashboard with request statistics
- Top voted requests view
- Team and category breakdowns

---

## Phase 2: Post-Launch — Done

### Roadmap Kanban View — Done
- Visual board with columns: Backlog, Discovery, In Progress, Released
- Drag-and-drop for admins to move items between columns
- Link requests to roadmap items
- Auto-sync status between requests and roadmap

### Request Merging — Done
- Identify and merge duplicate requests
- Transfer votes from merged requests to original
- Transfer comments optionally
- Clear "merged into" linking

### Feature Flags — Done
- Admin-controlled toggles stored in DB
- Current flags: `roadmap_kanban`, `request_merging`, `duplicate_detection`
- Default to enabled if flag doesn't exist

---

## Phase 3: Foundation — Done

### F2 — Supabase Migration — Done
- **Size**: XL | **Dependencies**: None (foundational)
- ~~Migrate SQL.js → Supabase PostgreSQL~~ ✓
- ~~Replace custom JWT auth → Supabase Auth~~ ✓
- ~~Local file storage → Supabase Storage buckets~~ ✓
- ~~Deployed to Railway with multi-stage Dockerfile~~ ✓
- Realtime subscriptions deferred to Phase 4
- Spec: `agent-os/specs/supabase-migration/shape.md`

---

## Phase 4: Platform Features — Planned

*After Supabase ships, features will be selected one-by-one in flexible order.*

### F1 — Multi-Project SaaS + Custom Request Forms — Future
- **Size**: XL | **Dependencies**: Supabase
- Multi-tenant: projects, user_projects, role hierarchy (Super Admin > Admin > User)
- Project switcher in header
- SSO: Google OAuth + Microsoft OAuth via Supabase Auth
- Custom request forms per project (3 levels):
  - Level 1: Toggle default fields on/off
  - Level 2: Customize field options (priorities, categories, teams, etc.)
  - Level 3: Create custom fields (text, select, number, date, checkbox, rating, URL, user picker)
- Field visibility control: submitter vs admin_only (max 4-5 submitter fields)
- Spec: `agent-os/specs/multi-project-saas/shape.md`

### F3 — Move Roadmap to Sidebar — Done
- **Size**: S | **Dependencies**: None
- ~~Dedicated sidebar nav item + `/roadmap` route~~ ✓
- ~~Remove from Dashboard tabs~~ ✓
- Files: `Sidebar.jsx`, `App.jsx`, `Dashboard.jsx`, `pages/Roadmap.jsx`
- Spec: `agent-os/specs/roadmap-sidebar/shape.md`

### F4 — AI Assistant (Anthropic Claude) — Future
- **Size**: L | **Dependencies**: None
- Server proxy to Claude API
- Summarize requests, identify trends, suggest priorities
- Admin-only chat interface
- Context: request data for time periods
- Spec: `agent-os/specs/ai-assistant/shape.md`

### F5 — Release Notes (with AI Drafting) — Future
- **Size**: L | **Dependencies**: Notifications (F8), AI Assistant (F4)
- Auto-draft on "Released" status (Claude API generates content)
- Batch releases, structured content (why/what/how/who)
- Distribution via notifications
- Spec: `agent-os/specs/release-notes/shape.md`

### F6 — Post on Behalf (Admin) — Future
- **Size**: S | **Dependencies**: None
- `posted_by_admin_id`, `on_behalf_of_user_id`, `on_behalf_of_name` columns
- Admin toggle in request form: select user or enter free-text name
- "Posted by X on behalf of Y" display
- Spec: `agent-os/specs/post-on-behalf/shape.md`

### F7 — Subscribe/Watch Requests — Future
- **Size**: M | **Dependencies**: None
- `request_watchers` table
- Auto-subscribe on create/comment/vote (configurable)
- Manual subscribe toggle on request detail
- "Watching" filter in My Requests
- Foundation for notifications (F8)
- Spec: `agent-os/specs/subscribe-watch/shape.md`

### F8 — Notifications System — Future
- **Size**: L | **Dependencies**: Subscribe/Watch (F7)
- `notifications`, `notification_preferences` tables
- Types: status_change, new_comment, mention, vote_milestone, watcher_update
- In-app bell icon + notification center
- Email via Resend or Supabase
- User preference toggles (per type, per channel)
- Spec: `agent-os/specs/notifications/shape.md`

### F9 — Vote Quotas — Future
- **Size**: M | **Dependencies**: None
- Admin-configurable quota per period (e.g., 10 votes/month, 20 votes/quarter)
- Track usage per user per period
- Show remaining votes in UI
- Period reset on time boundary
- Spec: `agent-os/specs/vote-quotas/shape.md`

### F10 — PWA — Future
- **Size**: M | **Dependencies**: None
- manifest.json, service worker, offline page
- Vite PWA plugin
- Push notifications (ties into F8)
- Spec: `agent-os/specs/pwa/shape.md`

### F11 — SAML SSO (Enterprise) — Future
- **Size**: L | **Dependencies**: Supabase Pro plan
- Requires Supabase Pro plan for SAML SSO support
- Domain-based login: email input → detect domain → route to IdP or password
- SSO connection management per project via Supabase Admin API
- Self-service setup UI: customer pastes IdP metadata (SSO URL, Entity ID, X.509 cert)
- Auto-provisioning: create user record on first SAML sign-in (no invite needed)
- Support for Okta, Microsoft Entra, OneLogin, Google Workspace SAML
- Optional: SCIM endpoint for automated user provisioning/deprovisioning
- `supabase.auth.signInWithSSO({ domain })` client integration

---

## Completed Features Log

| Feature | Phase | Date Completed |
|---------|-------|---------------|
| MVP (Request submission, voting, admin, auth, analytics) | 1 | Jan 2026 |
| Roadmap Kanban View | 2 | Jan 2026 |
| Request Merging | 2 | Jan 2026 |
| Feature Flags | 2 | Feb 2026 |
| Supabase Migration (DB + Auth + Storage + Deploy) | 3 | Feb 2026 |
| F3 — Move Roadmap to Sidebar | 4 | Feb 2026 |
