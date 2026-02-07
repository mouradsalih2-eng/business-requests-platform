-- ============================================================
-- 001: Rollback Initial Schema
-- Drops all tables, views, triggers, and functions in reverse order.
-- ============================================================

DROP TRIGGER IF EXISTS feature_flags_updated_at ON feature_flags;
DROP TRIGGER IF EXISTS comments_updated_at ON comments;
DROP TRIGGER IF EXISTS roadmap_items_updated_at ON roadmap_items;
DROP TRIGGER IF EXISTS requests_updated_at ON requests;
DROP FUNCTION IF EXISTS update_updated_at();

DROP VIEW IF EXISTS comments_with_author;
DROP VIEW IF EXISTS requests_with_counts;

DROP TABLE IF EXISTS password_reset_tokens;
DROP TABLE IF EXISTS verification_codes;
DROP TABLE IF EXISTS pending_registrations;
DROP TABLE IF EXISTS feature_flags;
DROP TABLE IF EXISTS roadmap_items;
DROP TABLE IF EXISTS request_tags;
DROP TABLE IF EXISTS admin_read_requests;
DROP TABLE IF EXISTS activity_log;
DROP TABLE IF EXISTS attachments;
DROP TABLE IF EXISTS comment_mentions;
DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS votes;
DROP TABLE IF EXISTS requests;
DROP TABLE IF EXISTS users;
