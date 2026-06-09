-- Run this in the Supabase SQL Editor.
-- Safe to run multiple times (IF NOT EXISTS / OR REPLACE).

-- 1. Core missing profile columns
alter table public.profiles
  add column if not exists hide_appreciations boolean not null default false;

alter table public.profiles
  add column if not exists hide_reposts boolean not null default false;

alter table public.profiles
  add column if not exists strike_count integer not null default 0;

-- 2. Moderator role
alter table public.profiles
  add column if not exists is_moderator boolean not null default false;

-- Moderators must not be able to promote themselves or others
-- (reuse the existing update policy guard — extend it for is_moderator)
drop policy if exists "Users can update own profile (restricted fields)" on public.profiles;
create policy "Users can update own profile (restricted fields)" on public.profiles
  for update using (auth.uid() = id)
  with check (
    auth.uid() = id
    AND is_admin     = (SELECT p.is_admin     FROM public.profiles p WHERE p.id = auth.uid())
    AND is_moderator = (SELECT p.is_moderator FROM public.profiles p WHERE p.id = auth.uid())
    AND strike_count = (SELECT p.strike_count FROM public.profiles p WHERE p.id = auth.uid())
  );

-- Allow moderators to read the moderation_actions table
drop policy if exists "Admins can see moderation actions" on public.moderation_actions;
create policy "Admins and moderators can see moderation actions" on public.moderation_actions
  for select using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and (is_admin = true or is_moderator = true)
    )
  );

-- Allow moderators to read user_strikes
drop policy if exists "Users and admins can see strikes" on public.user_strikes;
create policy "Users, admins and moderators can see strikes" on public.user_strikes
  for select using (
    auth.uid() = user_id
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and (is_admin = true or is_moderator = true)
    )
  );

-- 3. Real multi-device session tracking
create table if not exists public.user_sessions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  device text not null default 'Unknown',
  platform text not null default 'Unknown',
  last_active timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint user_sessions_user_device_platform_unique unique (user_id, device, platform)
);

alter table public.user_sessions enable row level security;

drop policy if exists "Users can manage their own sessions" on public.user_sessions;
create policy "Users can manage their own sessions" on public.user_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_user_sessions_user_id on public.user_sessions(user_id);
