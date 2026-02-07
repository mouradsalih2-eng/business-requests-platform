-- ============================================================
-- 005: Multi-Project Foundation + Role Hierarchy
-- ============================================================

-- Projects table
CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project members (user <-> project with role)
CREATE TABLE project_members (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (project_id, user_id)
);

-- Expand global role enum to include super_admin
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('employee', 'admin', 'super_admin'));

-- Add project_id to scoped tables
ALTER TABLE requests ADD COLUMN project_id INTEGER REFERENCES projects(id);
ALTER TABLE roadmap_items ADD COLUMN project_id INTEGER REFERENCES projects(id);
ALTER TABLE feature_flags ADD COLUMN project_id INTEGER REFERENCES projects(id);
ALTER TABLE activity_log ADD COLUMN project_id INTEGER REFERENCES projects(id);

-- Data migration: promote super admin
UPDATE users SET role = 'super_admin'
  WHERE auth_id = 'a43ecf11-551a-42a0-aa5b-036cd78d8f6d';

-- Create default project owned by super admin
INSERT INTO projects (name, slug, description, created_by)
  SELECT 'Default Project', 'default', 'Auto-created during migration', id
  FROM users WHERE auth_id = 'a43ecf11-551a-42a0-aa5b-036cd78d8f6d';

-- Add all existing users as project members
INSERT INTO project_members (project_id, user_id, role)
  SELECT p.id, u.id,
    CASE WHEN u.role IN ('admin', 'super_admin') THEN 'admin' ELSE 'member' END
  FROM users u, projects p WHERE p.slug = 'default';

-- Backfill project_id on existing data
UPDATE requests SET project_id = (SELECT id FROM projects WHERE slug = 'default') WHERE project_id IS NULL;
ALTER TABLE requests ALTER COLUMN project_id SET NOT NULL;

UPDATE roadmap_items SET project_id = (SELECT id FROM projects WHERE slug = 'default') WHERE project_id IS NULL;
ALTER TABLE roadmap_items ALTER COLUMN project_id SET NOT NULL;

UPDATE feature_flags SET project_id = (SELECT id FROM projects WHERE slug = 'default')
  WHERE project_id IS NULL;

UPDATE activity_log SET project_id = (SELECT id FROM projects WHERE slug = 'default')
  WHERE project_id IS NULL;

-- Rebuild feature_flags unique constraint to be per-project
ALTER TABLE feature_flags DROP CONSTRAINT IF EXISTS feature_flags_name_key;
ALTER TABLE feature_flags ADD CONSTRAINT feature_flags_name_project_key UNIQUE (name, project_id);

-- Rebuild requests_with_counts view (includes project_id)
DROP VIEW IF EXISTS requests_with_counts;
CREATE VIEW requests_with_counts AS
SELECT
  r.*,
  u.name  AS author_name,
  u.email AS author_email,
  admin_u.name AS posted_by_admin_name,
  COALESCE(v_up.cnt, 0)::int  AS upvotes,
  COALESCE(v_like.cnt, 0)::int AS likes,
  COALESCE(c.cnt, 0)::int     AS comment_count
FROM requests r
JOIN users u ON r.user_id = u.id
LEFT JOIN users admin_u ON r.posted_by_admin_id = admin_u.id
LEFT JOIN (
  SELECT request_id, COUNT(*) AS cnt FROM votes WHERE type = 'upvote' GROUP BY request_id
) v_up ON v_up.request_id = r.id
LEFT JOIN (
  SELECT request_id, COUNT(*) AS cnt FROM votes WHERE type = 'like' GROUP BY request_id
) v_like ON v_like.request_id = r.id
LEFT JOIN (
  SELECT request_id, COUNT(*) AS cnt FROM comments GROUP BY request_id
) c ON c.request_id = r.id;

-- Add indexes for performance
CREATE INDEX idx_requests_project_id ON requests(project_id);
CREATE INDEX idx_roadmap_items_project_id ON roadmap_items(project_id);
CREATE INDEX idx_project_members_user_id ON project_members(user_id);
CREATE INDEX idx_project_members_project_id ON project_members(project_id);
