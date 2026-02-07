# Vote Quotas — Shaping Notes

## Problem Statement

Without limits, power users can upvote every request, diluting the signal. Vote quotas force prioritization — users must choose which requests matter most to them.

## Key Decisions

### 1. Quota Model
- **Decision**: Admin-configurable votes per period
- Example: 10 votes/month, 20 votes/quarter
- Applies to upvotes only (likes are unlimited)
- Admin sets quota amount and period in platform settings

### 2. Period Options
- **Decision**: Support multiple period types
  - Monthly (resets 1st of each month)
  - Quarterly (resets Jan 1, Apr 1, Jul 1, Oct 1)
  - Custom (admin-defined number of days)
- Period reset is automatic based on time boundary

### 3. Quota Enforcement
- **Decision**: Soft enforcement with clear feedback
  - When quota reached: disable vote button, show "X/Y votes used this period"
  - Allow unvoting to reclaim quota (removing a vote gives it back)
  - No retroactive enforcement (existing votes before quota enabled stay)

### 4. Admin Controls
- **Decision**: Platform-wide setting (not per-user)
  - Enable/disable vote quotas
  - Set quota amount (e.g., 10)
  - Set period (monthly, quarterly, custom days)
  - View vote usage analytics

### 5. Visibility
- **Decision**: Show remaining votes prominently
  - Vote button area: "5 of 10 votes remaining"
  - Progress bar or counter in header/sidebar
  - My Requests page: "Your votes this period" summary

## Data Model

```sql
-- Platform settings for vote quotas (stored in feature_flags or settings table)
-- quota_enabled: boolean
-- quota_amount: integer
-- quota_period: 'monthly' | 'quarterly' | 'custom'
-- quota_custom_days: integer (if period is 'custom')

-- Vote tracking already exists, just need period calculation
-- votes table already has created_at for time-based filtering

-- Optional: cached quota usage for performance
CREATE TABLE vote_quota_usage (
  user_id INTEGER REFERENCES users(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  votes_used INTEGER DEFAULT 0,
  PRIMARY KEY (user_id, period_start)
);
```

## API Changes

- `GET /api/votes/quota` — Get current user's quota status (used, remaining, period)
- `POST /api/votes/:requestId` — Enforce quota check before allowing vote
- `DELETE /api/votes/:requestId` — Reclaim quota on unvote
- `GET /api/admin/vote-quota` — Get quota settings (admin)
- `PUT /api/admin/vote-quota` — Update quota settings (admin)

## Files to Change

### Server
- `server/src/routes/votes.js` — Add quota enforcement on vote creation
- `server/src/routes/admin.js` or settings — Quota configuration endpoints

### Client
- `client/src/components/social/VoteButtons.jsx` — Show remaining votes, disable when exhausted
- `client/src/pages/AdminPanel.jsx` — Quota configuration UI
- `client/src/pages/Settings.jsx` or header — Vote usage display
- `client/src/lib/api.js` — Add quota API methods

## Dependencies

None

## Effort Estimate

Medium — Quota logic, period calculation, UI feedback, admin config
