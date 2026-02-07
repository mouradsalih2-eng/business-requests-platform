-- ============================================================
-- Business Requests Platform — Initial Supabase Schema
-- Run this in the Supabase SQL editor to set up all tables.
-- ============================================================

-- Users
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'employee' CHECK (role IN ('employee', 'admin')),
  profile_picture TEXT,
  theme_preference TEXT DEFAULT 'light',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Requests
CREATE TABLE IF NOT EXISTS requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('bug', 'new_feature', 'optimization')),
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'backlog', 'in_progress', 'completed', 'rejected', 'duplicate', 'archived')),
  team TEXT DEFAULT 'Manufacturing' CHECK (team IN ('Manufacturing', 'Sales', 'Service', 'Energy')),
  region TEXT DEFAULT 'Global' CHECK (region IN ('EMEA', 'North America', 'APAC', 'Global')),
  business_problem TEXT,
  problem_size TEXT,
  business_expectations TEXT,
  expected_impact TEXT,
  merged_into_id INTEGER REFERENCES requests(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Votes
CREATE TABLE IF NOT EXISTS votes (
  id SERIAL PRIMARY KEY,
  request_id INTEGER NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  type TEXT NOT NULL CHECK (type IN ('upvote', 'like')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (request_id, user_id, type)
);

-- Comments
CREATE TABLE IF NOT EXISTS comments (
  id SERIAL PRIMARY KEY,
  request_id INTEGER NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comment Mentions
CREATE TABLE IF NOT EXISTS comment_mentions (
  id SERIAL PRIMARY KEY,
  comment_id INTEGER NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (comment_id, user_id)
);

-- Attachments
CREATE TABLE IF NOT EXISTS attachments (
  id SERIAL PRIMARY KEY,
  request_id INTEGER NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  filepath TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity Log
CREATE TABLE IF NOT EXISTS activity_log (
  id SERIAL PRIMARY KEY,
  request_id INTEGER NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin Read Requests (tracks "New" badge)
CREATE TABLE IF NOT EXISTS admin_read_requests (
  id SERIAL PRIMARY KEY,
  request_id INTEGER NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  admin_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (request_id, admin_id)
);

-- Request Tags
CREATE TABLE IF NOT EXISTS request_tags (
  id SERIAL PRIMARY KEY,
  request_id INTEGER NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (request_id, tag)
);

-- Roadmap Items
CREATE TABLE IF NOT EXISTS roadmap_items (
  id SERIAL PRIMARY KEY,
  request_id INTEGER REFERENCES requests(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  priority TEXT,
  team TEXT,
  region TEXT,
  column_status TEXT NOT NULL DEFAULT 'backlog' CHECK (column_status IN ('backlog', 'discovery', 'in_progress', 'released')),
  position INTEGER DEFAULT 0,
  is_discovery INTEGER DEFAULT 0,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Feature Flags
CREATE TABLE IF NOT EXISTS feature_flags (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  enabled BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pending Registrations
CREATE TABLE IF NOT EXISTS pending_registrations (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  verification_code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Verification Codes
CREATE TABLE IF NOT EXISTS verification_codes (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  type TEXT CHECK (type IN ('registration', 'password_change')),
  expires_at TIMESTAMPTZ NOT NULL,
  pending_data TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Password Reset Tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_requests_user_id ON requests(user_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_category ON requests(category);
CREATE INDEX IF NOT EXISTS idx_requests_created_at ON requests(created_at);
CREATE INDEX IF NOT EXISTS idx_votes_request_id ON votes(request_id);
CREATE INDEX IF NOT EXISTS idx_votes_user_request ON votes(user_id, request_id);
CREATE INDEX IF NOT EXISTS idx_comments_request_id ON comments(request_id);
CREATE INDEX IF NOT EXISTS idx_admin_read_requests_lookup ON admin_read_requests(request_id, admin_id);
CREATE INDEX IF NOT EXISTS idx_request_tags_request_id ON request_tags(request_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_items_column ON roadmap_items(column_status);
CREATE INDEX IF NOT EXISTS idx_roadmap_items_request ON roadmap_items(request_id);
CREATE INDEX IF NOT EXISTS idx_verification_codes_email ON verification_codes(email);
CREATE INDEX IF NOT EXISTS idx_pending_registrations_email ON pending_registrations(email);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);

-- ============================================================
-- Views for common read patterns
-- ============================================================

CREATE OR REPLACE VIEW requests_with_counts AS
SELECT
  r.*,
  u.name  AS author_name,
  u.email AS author_email,
  COALESCE(v_up.cnt, 0)::int  AS upvotes,
  COALESCE(v_like.cnt, 0)::int AS likes,
  COALESCE(c.cnt, 0)::int     AS comment_count
FROM requests r
JOIN users u ON r.user_id = u.id
LEFT JOIN (
  SELECT request_id, COUNT(*) AS cnt FROM votes WHERE type = 'upvote' GROUP BY request_id
) v_up ON v_up.request_id = r.id
LEFT JOIN (
  SELECT request_id, COUNT(*) AS cnt FROM votes WHERE type = 'like' GROUP BY request_id
) v_like ON v_like.request_id = r.id
LEFT JOIN (
  SELECT request_id, COUNT(*) AS cnt FROM comments GROUP BY request_id
) c ON c.request_id = r.id;

CREATE OR REPLACE VIEW comments_with_author AS
SELECT
  c.*,
  u.name  AS author_name,
  u.email AS author_email
FROM comments c
JOIN users u ON c.user_id = u.id;

-- ============================================================
-- Seed default feature flags
-- ============================================================

INSERT INTO feature_flags (name, enabled, description)
VALUES
  ('roadmap_kanban', true, 'Roadmap Kanban board view and request-roadmap sync'),
  ('request_merging', true, 'Merge duplicate requests'),
  ('duplicate_detection', true, 'Suggest similar requests when creating')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- Trigger: auto-update updated_at on requests
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER requests_updated_at
  BEFORE UPDATE ON requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER roadmap_items_updated_at
  BEFORE UPDATE ON roadmap_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER feature_flags_updated_at
  BEFORE UPDATE ON feature_flags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
