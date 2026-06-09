-- ============================================================
-- Overthinkers — Schema v3 (Incremental Migration)
-- Run AFTER schema.sql and schema-v2.sql
-- All statements are idempotent (safe to re-run).
-- ============================================================

-- ─── EXTENSIONS ──────────────────────────────────────────────────────────────
create extension if not exists pg_trgm;

-- ─── PROFILES: add is_moderator column ───────────────────────────────────────
alter table public.profiles
  add column if not exists is_moderator boolean not null default false;

-- ─── USER SESSIONS ───────────────────────────────────────────────────────────
create table if not exists public.user_sessions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  device text not null default 'Unknown',
  platform text not null default 'Unknown',
  last_active timestamptz not null default now(),
  created_at timestamptz default now(),
  unique(user_id, device, platform)
);

alter table public.user_sessions enable row level security;

drop policy if exists "Users can see their own sessions" on public.user_sessions;
create policy "Users can see their own sessions" on public.user_sessions
  for select using (auth.uid() = user_id);

drop policy if exists "Users can insert their own sessions" on public.user_sessions;
create policy "Users can insert their own sessions" on public.user_sessions
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update their own sessions" on public.user_sessions;
create policy "Users can update their own sessions" on public.user_sessions
  for update using (auth.uid() = user_id);

drop policy if exists "Users can delete their own sessions" on public.user_sessions;
create policy "Users can delete their own sessions" on public.user_sessions
  for delete using (auth.uid() = user_id);

create index if not exists user_sessions_user_id_idx on public.user_sessions(user_id);
create index if not exists user_sessions_last_active_idx on public.user_sessions(last_active desc);

-- ─── REPORTS: add dismissed tracking ─────────────────────────────────────────
alter table public.reports
  add column if not exists dismissed_at timestamptz,
  add column if not exists dismissed_by uuid references public.profiles(id) on delete set null;

-- ─── REPORTS: admins and moderators can see all reports ──────────────────────
drop policy if exists "Admins can see all reports" on public.reports;
create policy "Admins can see all reports" on public.reports
  for select using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and (is_admin = true or is_moderator = true)
    )
  );

-- Index for report queue (undismissed reports only)
create index if not exists reports_undismissed_idx
  on public.reports(created_at desc)
  where dismissed_at is null;

-- ─── NOTIFICATIONS: tighten INSERT — actors must be themselves ────────────────
-- Replaces the over-permissive "auth.role() = 'authenticated'" policy.
drop policy if exists "Service role can create notifications" on public.notifications;
drop policy if exists "Authenticated users can create notifications" on public.notifications;
create policy "Authenticated users can create notifications" on public.notifications
  for insert with check (
    auth.uid() = actor_id
    or actor_id is null
  );

-- ─── THOUGHTS: enforce private-account visibility ────────────────────────────
-- Replaces the "viewable by everyone" policy.
-- Private-account thoughts are only visible to the author and their followers.
drop policy if exists "Thoughts are viewable by everyone" on public.thoughts;
create policy "Thoughts are viewable" on public.thoughts
  for select using (
    auth.uid() = author_id
    or not (select is_private from public.profiles where id = author_id)
    or exists (
      select 1 from public.follows
      where follower_id = auth.uid() and following_id = author_id
    )
  );

-- ─── MODERATION ACTIONS: INSERT for admins and moderators ────────────────────
drop policy if exists "Admins can insert moderation actions" on public.moderation_actions;
create policy "Admins can insert moderation actions" on public.moderation_actions
  for insert with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and (is_admin = true or is_moderator = true)
    )
  );

-- Moderator SELECT (extends existing admin-only policy)
drop policy if exists "Moderators can view moderation actions" on public.moderation_actions;
create policy "Moderators can view moderation actions" on public.moderation_actions
  for select using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and (is_admin = true or is_moderator = true)
    )
  );

-- ─── USER STRIKES: INSERT and moderator SELECT ───────────────────────────────
drop policy if exists "Admins can insert user strikes" on public.user_strikes;
create policy "Admins can insert user strikes" on public.user_strikes
  for insert with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and (is_admin = true or is_moderator = true)
    )
  );

drop policy if exists "Moderators can see all strikes" on public.user_strikes;
create policy "Moderators can see all strikes" on public.user_strikes
  for select using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and (is_admin = true or is_moderator = true)
    )
  );

-- ─── RPC: admin_dismiss_reports ──────────────────────────────────────────────
create or replace function public.admin_dismiss_reports(
  p_target_type text,
  p_target_id uuid
)
returns void language plpgsql security definer as $$
declare
  v_can_act boolean;
begin
  select (coalesce(is_admin, false) or coalesce(is_moderator, false))
  into v_can_act
  from public.profiles where id = auth.uid();

  if not coalesce(v_can_act, false) then
    raise exception 'Access denied: admin or moderator only';
  end if;

  update public.reports
  set dismissed_at = now(), dismissed_by = auth.uid()
  where dismissed_at is null
    and (
      (p_target_type = 'thought' and thought_id = p_target_id)
      or (p_target_type = 'comment' and comment_id = p_target_id)
    );

  insert into public.moderation_actions (moderator_id, target_type, target_id, action, note)
  values (auth.uid(), p_target_type, p_target_id, 'dismiss', null);
end;
$$;

-- ─── RPC: admin_remove_content ───────────────────────────────────────────────
create or replace function public.admin_remove_content(
  p_target_type text,
  p_target_id uuid
)
returns void language plpgsql security definer as $$
declare
  v_is_admin boolean;
begin
  select coalesce(is_admin, false) into v_is_admin
  from public.profiles where id = auth.uid();

  if not v_is_admin then
    raise exception 'Access denied: admin only';
  end if;

  if p_target_type = 'thought' then
    delete from public.thoughts where id = p_target_id;
  elsif p_target_type = 'comment' then
    delete from public.comments where id = p_target_id;
  end if;

  update public.reports
  set dismissed_at = now(), dismissed_by = auth.uid()
  where dismissed_at is null
    and (
      (p_target_type = 'thought' and thought_id = p_target_id)
      or (p_target_type = 'comment' and comment_id = p_target_id)
    );

  insert into public.moderation_actions (moderator_id, target_type, target_id, action, note)
  values (auth.uid(), p_target_type, p_target_id, 'remove', 'Content removed by admin');
end;
$$;

-- ─── RPC: issue_user_strike (updated — allows moderators, sends notification) ─
create or replace function public.issue_user_strike(
  p_user_id uuid,
  p_reason text
)
returns uuid language plpgsql security definer as $$
declare
  v_can_act boolean;
  v_id uuid;
begin
  select (coalesce(is_admin, false) or coalesce(is_moderator, false))
  into v_can_act
  from public.profiles where id = auth.uid();

  if not coalesce(v_can_act, false) then
    raise exception 'Access denied: admin or moderator only';
  end if;

  insert into public.user_strikes (user_id, reason, issued_by)
  values (p_user_id, p_reason, auth.uid())
  returning id into v_id;

  update public.profiles set strike_count = strike_count + 1 where id = p_user_id;

  insert into public.notifications (user_id, type, actor_id)
  values (p_user_id, 'system', null);

  return v_id;
end;
$$;

-- ─── RPC: create_moderation_action (updated — allows moderators) ──────────────
create or replace function public.create_moderation_action(
  p_target_type text,
  p_target_id uuid,
  p_action text,
  p_note text default null
)
returns uuid language plpgsql security definer as $$
declare
  v_can_act boolean;
  v_id uuid;
begin
  select (coalesce(is_admin, false) or coalesce(is_moderator, false))
  into v_can_act
  from public.profiles where id = auth.uid();

  if not coalesce(v_can_act, false) then
    raise exception 'Access denied: admin or moderator only';
  end if;

  insert into public.moderation_actions (moderator_id, target_type, target_id, action, note)
  values (auth.uid(), p_target_type, p_target_id, p_action, p_note)
  returning id into v_id;

  return v_id;
end;
$$;

-- ─── STORAGE: avatars bucket RLS ─────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "Avatar images are publicly accessible" on storage.objects;
create policy "Avatar images are publicly accessible" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users can update their own avatar" on storage.objects;
create policy "Users can update their own avatar" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users can delete their own avatar" on storage.objects;
create policy "Users can delete their own avatar" on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ─── PERFORMANCE INDEXES ──────────────────────────────────────────────────────
-- Compound index for category feeds
create index if not exists thoughts_category_created_idx
  on public.thoughts(category, created_at desc);

-- Compound index for author profile pages
create index if not exists thoughts_author_created_idx
  on public.thoughts(author_id, created_at desc);

-- Partial index for repost-only queries
create index if not exists thoughts_is_repost_idx
  on public.thoughts(author_id, created_at desc)
  where is_repost = true;

-- Profile fuzzy search (requires pg_trgm)
create index if not exists profiles_username_trgm_idx
  on public.profiles using gin(username gin_trgm_ops);

create index if not exists profiles_display_name_trgm_idx
  on public.profiles using gin(display_name gin_trgm_ops);

-- Hashtag compound index
create index if not exists thought_hashtags_compound_idx
  on public.thought_hashtags(hashtag_id, thought_id);

-- ─── REALTIME: subscribe new tables ──────────────────────────────────────────
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.user_sessions;
