# Supabase Migration - Shaping Notes

## Problem Statement

Current SQL.js (SQLite in-memory/file) setup has limitations:
- No horizontal scaling
- File-based persistence risk
- No built-in auth system
- No real-time capabilities
- Limited to single server deployment

## Key Decisions

### 1. Migration Target
- **Decision**: Supabase (full stack)
- **Rationale**:
  - PostgreSQL (production-ready, scalable)
  - Built-in Auth (SSO-ready)
  - Storage for attachments
  - Realtime subscriptions
  - Generous free tier for MVP

### 2. Supabase Services to Use

#### PostgreSQL Database
- Replace SQL.js with Supabase PostgreSQL
- Row Level Security (RLS) for multi-tenant isolation
- Migrations via Supabase CLI

#### Supabase Auth
- Replace custom JWT auth
- Social providers (Google, Microsoft)
- Enterprise SSO (SAML/OIDC)
- Session management built-in

#### Supabase Storage
- Replace local file attachments
- Secure file URLs with policies
- Image transformations

#### Supabase Realtime
- Live updates on requests
- Real-time comments
- Vote count updates

### 3. Migration Strategy
- **Decision**: Incremental migration, feature by feature
- **Order**:
  1. Database (PostgreSQL)
  2. Auth
  3. Storage
  4. Realtime
- **Rationale**: Reduce risk, validate each step

## Technical Changes

### Database Layer

**Current** (`server/src/db/database.js`):
```javascript
import initSqlJs from 'sql-js';
const db = await initSqlJs();
export const run = (sql, params) => db.run(sql, params);
```

**Target** (Supabase client):
```javascript
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Queries become:
const { data, error } = await supabase
  .from('requests')
  .select('*')
  .eq('status', 'approved');
```

### Auth Layer

**Current** (`server/src/middleware/auth.js`):
```javascript
import jwt from 'jsonwebtoken';
const decoded = jwt.verify(token, JWT_SECRET);
```

**Target** (Supabase Auth):
```javascript
const { data: { user } } = await supabase.auth.getUser();
// Session handled automatically
```

### Storage Layer

**Current**: Local filesystem
**Target**: Supabase Storage buckets

### API Changes

Most API routes stay similar but use Supabase client:
- `GET /api/requests` → `supabase.from('requests').select()`
- `POST /api/requests` → `supabase.from('requests').insert()`
- Auth endpoints removed (use Supabase Auth)

## Environment Variables

**Remove**:
- `JWT_SECRET`
- Database file paths

**Add**:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY` (server-side only)

## Row Level Security (RLS)

Enable RLS for multi-tenant isolation:
```sql
-- Example: Users can only see requests in their projects
CREATE POLICY "Users see own project requests" ON requests
  FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM user_projects
      WHERE user_id = auth.uid()
    )
  );
```

## Out of Scope (Future)

- Edge functions for complex server logic
- Database branching for dev/staging
- Point-in-time recovery setup
- Read replicas

## Dependencies

None - foundational change

## Effort Estimate

Large - Major architectural rewrite, data migration, thorough testing required
