-- ============================================================
-- 006: Revert OAuth Support
-- ============================================================

ALTER TABLE users DROP COLUMN IF EXISTS auth_provider;
