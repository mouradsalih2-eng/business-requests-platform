-- ============================================================
-- 006: OAuth Support — add auth_provider column
-- ============================================================

ALTER TABLE users ADD COLUMN auth_provider TEXT DEFAULT 'email'
  CHECK (auth_provider IN ('email', 'google', 'microsoft'));
