-- ============================================================
-- 004: Post on Behalf — add admin attribution columns
-- ============================================================

ALTER TABLE requests ADD COLUMN posted_by_admin_id INTEGER REFERENCES users(id);
ALTER TABLE requests ADD COLUMN on_behalf_of_user_id INTEGER REFERENCES users(id);
ALTER TABLE requests ADD COLUMN on_behalf_of_name TEXT;

-- Must DROP + CREATE because adding columns to r.* changes the view shape
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
