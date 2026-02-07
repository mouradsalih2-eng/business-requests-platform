-- ============================================================
-- 002: Supabase Auth Integration
-- Adds auth_id column to link app users with Supabase Auth users.
-- Passwords are now managed by Supabase Auth.
-- ============================================================

-- Link users to Supabase Auth
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_id UUID UNIQUE;
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);

-- Password is now managed by Supabase Auth (nullable for new users)
ALTER TABLE users ALTER COLUMN password DROP NOT NULL;

-- Pending registrations: store Supabase Auth user ID instead of password hash
ALTER TABLE pending_registrations ADD COLUMN IF NOT EXISTS auth_id UUID;
ALTER TABLE pending_registrations ALTER COLUMN password_hash DROP NOT NULL;
