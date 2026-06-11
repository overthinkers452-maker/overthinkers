-- ============================================================
-- Thought Media Storage Bucket
-- ============================================================

-- Create the thought-media bucket (public so images are accessible)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'thought-media',
  'thought-media',
  true,
  10485760, -- 10 MB limit (media can be larger than avatars)
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];

-- RLS Policies
drop policy if exists "Public thought-media read" on storage.objects;
create policy "Public thought-media read"
on storage.objects for select
using ( bucket_id = 'thought-media' );

drop policy if exists "Users upload own thought-media" on storage.objects;
create policy "Users upload own thought-media"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'thought-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users update own thought-media" on storage.objects;
create policy "Users update own thought-media"
on storage.objects for update
to authenticated
using (
  bucket_id = 'thought-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users delete own thought-media" on storage.objects;
create policy "Users delete own thought-media"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'thought-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);