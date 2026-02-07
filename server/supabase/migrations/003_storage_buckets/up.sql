-- ============================================================
-- 003: Supabase Storage Buckets
-- Creates public buckets for avatars and attachments with RLS policies.
-- ============================================================

-- Create storage buckets (public so URLs are accessible without auth)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', true)
ON CONFLICT (id) DO NOTHING;

-- ── Avatars bucket policies ──────────────────────────────────

-- Anyone can view avatars (public bucket)
CREATE POLICY "avatars_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Authenticated users can upload their own avatar
CREATE POLICY "avatars_auth_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
  );

-- Users can update/delete their own avatars (path starts with their auth uid)
CREATE POLICY "avatars_owner_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "avatars_owner_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ── Attachments bucket policies ──────────────────────────────

-- Anyone can view attachments (public bucket)
CREATE POLICY "attachments_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'attachments');

-- Authenticated users can upload attachments
CREATE POLICY "attachments_auth_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'attachments'
    AND auth.role() = 'authenticated'
  );

-- Authenticated users can delete attachments (admin enforcement at app level)
CREATE POLICY "attachments_auth_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'attachments'
    AND auth.role() = 'authenticated'
  );
