-- ============================================================
-- Overthinkers — Thought Media Migration
-- Run in Supabase SQL Editor after storage-buckets.sql
-- ============================================================

-- Add media_url column to thoughts table
alter table public.thoughts
  add column if not exists media_url text;

-- Create the thought-media storage bucket (public, 10 MB, images only)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'thought-media',
  'thought-media',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- Anyone can read public thought media
create policy "Public thought-media read"
on storage.objects for select
using ( bucket_id = 'thought-media' );

-- Authenticated users upload into their own folder
create policy "Authenticated users upload thought media"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'thought-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can delete their own media
create policy "Users delete own thought media"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'thought-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);
