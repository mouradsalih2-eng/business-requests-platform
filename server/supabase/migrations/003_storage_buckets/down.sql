-- ============================================================
-- 003: Rollback Storage Buckets
-- Drops all storage policies and buckets.
-- ============================================================

-- Drop attachment policies
DROP POLICY IF EXISTS "attachments_auth_delete" ON storage.objects;
DROP POLICY IF EXISTS "attachments_auth_insert" ON storage.objects;
DROP POLICY IF EXISTS "attachments_public_read" ON storage.objects;

-- Drop avatar policies
DROP POLICY IF EXISTS "avatars_owner_delete" ON storage.objects;
DROP POLICY IF EXISTS "avatars_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "avatars_auth_insert" ON storage.objects;
DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;

-- Remove all objects then delete buckets
DELETE FROM storage.objects WHERE bucket_id IN ('avatars', 'attachments');
DELETE FROM storage.buckets WHERE id IN ('avatars', 'attachments');
