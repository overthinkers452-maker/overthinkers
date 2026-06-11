-- ============================================================
-- Overthinkers — Supabase Storage Buckets
-- Run in Supabase SQL Editor after schema.sql
-- ============================================================

-- Create the avatars bucket (public so images are accessible without auth)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880, -- 5 MB limit
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- ─── RLS Policies ─────────────────────────────────────────────────────────────

-- Anyone can read public avatars
create policy "Public avatar read"
on storage.objects for select
using ( bucket_id = 'avatars' );

-- Authenticated users can upload to their own folder only
create policy "Users upload own avatar"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can update (upsert) their own files
create policy "Users update own avatar"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can delete their own files
create policy "Users delete own avatar"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);
