-- ============================================================
-- 005: Revert Multi-Project Foundation
-- ============================================================

-- Drop indexes
DROP INDEX IF EXISTS idx_requests_project_id;
DROP INDEX IF EXISTS idx_roadmap_items_project_id;
DROP INDEX IF EXISTS idx_project_members_user_id;
DROP INDEX IF EXISTS idx_project_members_project_id;

-- Restore feature_flags unique constraint
ALTER TABLE feature_flags DROP CONSTRAINT IF EXISTS feature_flags_name_project_key;
ALTER TABLE feature_flags ADD CONSTRAINT feature_flags_name_key UNIQUE (name);

-- Drop project_id columns
ALTER TABLE activity_log DROP COLUMN IF EXISTS project_id;
ALTER TABLE feature_flags DROP COLUMN IF EXISTS project_id;
ALTER TABLE roadmap_items DROP COLUMN IF EXISTS project_id;
ALTER TABLE requests DROP COLUMN IF EXISTS project_id;

-- Revert super_admin back to admin
UPDATE users SET role = 'admin' WHERE role = 'super_admin';

-- Restore role constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('employee', 'admin'));

-- Drop project tables
DROP TABLE IF EXISTS project_members;
DROP TABLE IF EXISTS projects;

-- Rebuild requests_with_counts view without project_id
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
