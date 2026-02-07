# Post on Behalf (Admin) — Shaping Notes

## Problem Statement

Admins often receive feature requests verbally, via email, or from external stakeholders who don't have platform accounts. They need a way to submit these requests while attributing them to the original requester.

## Key Decisions

### 1. Attribution Model
- **Decision**: Dual attribution — who submitted + who requested
- `posted_by_admin_id` — the admin who created it
- `on_behalf_of_user_id` — existing user (if they have an account)
- `on_behalf_of_name` — free-text name (for non-users)
- At least one of `on_behalf_of_user_id` or `on_behalf_of_name` required when posting on behalf

### 2. Admin UX
- **Decision**: Toggle in request form
- Default: posting as themselves (normal flow)
- Toggle: "Post on behalf of someone" reveals user picker + free-text fallback
- User picker searches existing users
- Free-text for external stakeholders without accounts

### 3. Display
- **Decision**: Show both names
- Request card: "Posted by Admin Name on behalf of Requester Name"
- Request detail: Clear attribution with both parties
- If `on_behalf_of_user_id` is set, their avatar shown; otherwise generic icon

### 4. Ownership
- **Decision**: The on-behalf-of user is the logical owner
- If they have an account, the request appears in their "My Requests"
- They can comment and vote on it
- Admin retains edit/delete rights

## Data Model Changes

```sql
ALTER TABLE requests ADD COLUMN posted_by_admin_id INTEGER REFERENCES users(id);
ALTER TABLE requests ADD COLUMN on_behalf_of_user_id INTEGER REFERENCES users(id);
ALTER TABLE requests ADD COLUMN on_behalf_of_name TEXT;
```

## API Changes

- `POST /api/requests` — Accept optional `on_behalf_of_user_id` and `on_behalf_of_name` (admin only)
- `GET /api/requests` — Include on-behalf-of info in response
- Validation: only admins can set on-behalf-of fields

## Files to Change

### Server
- `server/src/routes/requests.js` — Handle on-behalf-of fields in create
- `server/src/db/schema.sql` — Add columns (or migration)
- `server/src/validation/schemas.js` — Add on-behalf-of to request schema

### Client
- `client/src/pages/NewRequest.jsx` — Add on-behalf-of toggle and inputs
- `client/src/components/requests/RequestCard.jsx` — Show attribution
- `client/src/components/requests/RequestDetail.jsx` — Show attribution

## Dependencies

None

## Effort Estimate

Small — DB columns, form toggle, display changes
