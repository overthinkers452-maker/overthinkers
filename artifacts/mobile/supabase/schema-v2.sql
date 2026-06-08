-- ============================================================
-- Overthinkers — Schema v2 (Incremental Migration)
-- Run this AFTER schema.sql in the Supabase SQL Editor.
-- All statements are idempotent (safe to re-run).
-- ============================================================

-- ─── PROFILES: new privacy & admin columns ───────────────────────────────────
alter table public.profiles
  add column if not exists is_private boolean not null default false,
  add column if not exists hide_appreciations boolean not null default false,
  add column if not exists hide_reposts boolean not null default false,
  add column if not exists is_admin boolean not null default false,
  add column if not exists strike_count integer not null default 0;

-- ─── NOTIFICATIONS: extend type enum to include mention & system ──────────────
-- Supabase does not support ALTER DOMAIN on check constraints directly,
-- so we drop and recreate the constraint by name.
alter table public.notifications
  drop constraint if exists notifications_type_check;
alter table public.notifications
  add constraint notifications_type_check
  check (type in ('appreciation', 'comment', 'repost', 'follow', 'badge', 'reply', 'mention', 'system'));

-- ─── MUTES ───────────────────────────────────────────────────────────────────
create table if not exists public.mutes (
  id uuid default uuid_generate_v4() primary key,
  muter_id uuid references public.profiles(id) on delete cascade not null,
  muted_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(muter_id, muted_id)
);

alter table public.mutes enable row level security;

drop policy if exists "Users can see their own mutes" on public.mutes;
create policy "Users can see their own mutes" on public.mutes
  for select using (auth.uid() = muter_id);

drop policy if exists "Authenticated users can mute" on public.mutes;
create policy "Authenticated users can mute" on public.mutes
  for insert with check (auth.uid() = muter_id);

drop policy if exists "Users can unmute" on public.mutes;
create policy "Users can unmute" on public.mutes
  for delete using (auth.uid() = muter_id);

create index if not exists mutes_muter_idx on public.mutes(muter_id);

-- ─── SECURITY LOGS ───────────────────────────────────────────────────────────
create table if not exists public.security_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid not null,
  event_type text not null
    check (event_type in ('login_success', 'login_fail', 'password_change', 'signout', 'signup')),
  metadata jsonb,
  created_at timestamptz default now()
);

alter table public.security_logs enable row level security;

drop policy if exists "Users can see their own security logs" on public.security_logs;
create policy "Users can see their own security logs" on public.security_logs
  for select using (auth.uid() = user_id);

drop policy if exists "Users can insert their own security logs" on public.security_logs;
create policy "Users can insert their own security logs" on public.security_logs
  for insert with check (auth.uid() = user_id);

create index if not exists security_logs_user_idx on public.security_logs(user_id, created_at desc);

-- ─── HASHTAGS ────────────────────────────────────────────────────────────────
create table if not exists public.hashtags (
  id uuid default uuid_generate_v4() primary key,
  tag text unique not null,
  usage_count integer not null default 0,
  created_at timestamptz default now()
);

alter table public.hashtags enable row level security;

drop policy if exists "Hashtags are viewable by everyone" on public.hashtags;
create policy "Hashtags are viewable by everyone" on public.hashtags
  for select using (true);

create index if not exists hashtags_tag_idx on public.hashtags(tag);
create index if not exists hashtags_usage_idx on public.hashtags(usage_count desc);

-- ─── THOUGHT HASHTAGS ────────────────────────────────────────────────────────
create table if not exists public.thought_hashtags (
  id uuid default uuid_generate_v4() primary key,
  thought_id uuid references public.thoughts(id) on delete cascade not null,
  hashtag_id uuid references public.hashtags(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(thought_id, hashtag_id)
);

alter table public.thought_hashtags enable row level security;

drop policy if exists "Thought hashtags are viewable by everyone" on public.thought_hashtags;
create policy "Thought hashtags are viewable by everyone" on public.thought_hashtags
  for select using (true);

drop policy if exists "Authors can tag their own thoughts" on public.thought_hashtags;
create policy "Authors can tag their own thoughts" on public.thought_hashtags
  for insert with check (
    auth.uid() = (select author_id from public.thoughts where id = thought_id)
  );

create index if not exists thought_hashtags_thought_idx on public.thought_hashtags(thought_id);
create index if not exists thought_hashtags_hashtag_idx on public.thought_hashtags(hashtag_id);

-- ─── MODERATION ACTIONS ──────────────────────────────────────────────────────
create table if not exists public.moderation_actions (
  id uuid default uuid_generate_v4() primary key,
  moderator_id uuid references public.profiles(id) on delete set null,
  target_type text not null
    check (target_type in ('thought', 'comment', 'user')),
  target_id uuid not null,
  action text not null
    check (action in ('dismiss', 'remove', 'warn', 'ban')),
  note text,
  created_at timestamptz default now()
);

alter table public.moderation_actions enable row level security;

drop policy if exists "Admins can view moderation actions" on public.moderation_actions;
create policy "Admins can view moderation actions" on public.moderation_actions
  for select using (
    (select is_admin from public.profiles where id = auth.uid())
  );

create index if not exists moderation_actions_moderator_idx on public.moderation_actions(moderator_id);
create index if not exists moderation_actions_target_idx on public.moderation_actions(target_id);

-- ─── USER STRIKES ────────────────────────────────────────────────────────────
create table if not exists public.user_strikes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  reason text not null,
  issued_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

alter table public.user_strikes enable row level security;

drop policy if exists "Users can see their own strikes" on public.user_strikes;
create policy "Users can see their own strikes" on public.user_strikes
  for select using (auth.uid() = user_id);

drop policy if exists "Admins can see all strikes" on public.user_strikes;
create policy "Admins can see all strikes" on public.user_strikes
  for select using (
    (select is_admin from public.profiles where id = auth.uid())
  );

create index if not exists user_strikes_user_idx on public.user_strikes(user_id);

-- ─── RPCs: Hashtag counters ───────────────────────────────────────────────────
create or replace function public.upsert_hashtag_and_increment(p_tag text)
returns uuid language plpgsql security definer as $$
declare
  v_id uuid;
begin
  insert into public.hashtags (tag, usage_count)
  values (lower(p_tag), 1)
  on conflict (tag) do update set usage_count = hashtags.usage_count + 1
  returning id into v_id;
  return v_id;
end;
$$;

-- ─── RPCs: Moderation (security-definer, admin-only) ─────────────────────────
create or replace function public.create_moderation_action(
  p_target_type text,
  p_target_id uuid,
  p_action text,
  p_note text default null
)
returns uuid language plpgsql security definer as $$
declare
  v_is_admin boolean;
  v_id uuid;
begin
  select is_admin into v_is_admin from public.profiles where id = auth.uid();
  if not coalesce(v_is_admin, false) then
    raise exception 'Access denied: admin only';
  end if;

  insert into public.moderation_actions (moderator_id, target_type, target_id, action, note)
  values (auth.uid(), p_target_type, p_target_id, p_action, p_note)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.issue_user_strike(
  p_user_id uuid,
  p_reason text
)
returns uuid language plpgsql security definer as $$
declare
  v_is_admin boolean;
  v_id uuid;
begin
  select is_admin into v_is_admin from public.profiles where id = auth.uid();
  if not coalesce(v_is_admin, false) then
    raise exception 'Access denied: admin only';
  end if;

  insert into public.user_strikes (user_id, reason, issued_by)
  values (p_user_id, p_reason, auth.uid())
  returning id into v_id;

  update public.profiles set strike_count = strike_count + 1 where id = p_user_id;

  return v_id;
end;
$$;

-- ─── REALTIME: add new tables ─────────────────────────────────────────────────
alter publication supabase_realtime add table public.mutes;
