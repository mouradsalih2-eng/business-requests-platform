-- ============================================================
-- 004: Revert Post on Behalf
-- ============================================================

ALTER TABLE requests DROP COLUMN IF EXISTS posted_by_admin_id;
ALTER TABLE requests DROP COLUMN IF EXISTS on_behalf_of_user_id;
ALTER TABLE requests DROP COLUMN IF EXISTS on_behalf_of_name;

-- Restore original view without admin attribution
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
