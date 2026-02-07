-- ============================================================
-- 002: Rollback Supabase Auth Integration
-- Reverts auth_id column and restores password NOT NULL constraint.
-- ============================================================

DROP INDEX IF EXISTS idx_users_auth_id;
ALTER TABLE users DROP COLUMN IF EXISTS auth_id;
ALTER TABLE users ALTER COLUMN password SET NOT NULL;

ALTER TABLE pending_registrations DROP COLUMN IF EXISTS auth_id;
ALTER TABLE pending_registrations ALTER COLUMN password_hash SET NOT NULL;
