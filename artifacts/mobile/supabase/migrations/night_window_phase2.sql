-- ============================================================
-- Night Window Phase 2 — Streaks, Mood, Engagement Tracking
-- ============================================================

-- ─── Night Activity Table ────────────────────────────────────
-- Tracks per-user night session activity for streaks and stats
create table if not exists public.night_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  session_date date not null,           -- IST date of the night session
  mood_emoji text,                       -- 🌙 💭 🌊 🌟 🌌  etc.
  thoughts_posted int default 0,
  appreciations_received int default 0,
  appreciations_given int default 0,
  is_active boolean default true,        -- false if session has closed
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, session_date)
);

-- ─── Night Streaks Table ─────────────────────────────────────
-- Stores current and longest streak per user
create table if not exists public.night_streaks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references public.profiles(id) on delete cascade,
  current_streak int default 0,
  longest_streak int default 0,
  last_active_date date,                 -- Last IST date user was active
  updated_at timestamptz default now()
);

-- ─── Night Badges Earned ─────────────────────────────────────
-- Persists badge unlocks so they display even outside the window
create table if not exists public.night_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_id text not null,                -- "night_owl", "night_thinker", "moon_child", "nocturnal_sage"
  earned_at timestamptz default now(),
  unique(user_id, badge_id)
);

-- ─── Indexes ─────────────────────────────────────────────────
create index if not exists night_activity_user_idx on public.night_activity(user_id, session_date desc);
create index if not exists night_activity_date_idx on public.night_activity(session_date desc);
create index if not exists night_badges_user_idx on public.night_badges(user_id);

-- ─── RLS ─────────────────────────────────────────────────────
alter table public.night_activity enable row level security;
alter table public.night_streaks enable row level security;
alter table public.night_badges enable row level security;

-- Allow users to read their own activity
drop policy if exists "Users can read own night activity" on public.night_activity;
create policy "Users can read own night activity"
  on public.night_activity for select
  using (auth.uid() = user_id);

-- Allow users to upsert their own activity
drop policy if exists "Users can upsert own night activity" on public.night_activity;
create policy "Users can upsert own night activity"
  on public.night_activity for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own night activity" on public.night_activity;
create policy "Users can update own night activity"
  on public.night_activity for update
  using (auth.uid() = user_id);

-- Allow users to read their own streaks
drop policy if exists "Users can read own night streaks" on public.night_streaks;
create policy "Users can read own night streaks"
  on public.night_streaks for select
  using (auth.uid() = user_id);

-- Allow users to upsert their own streaks
drop policy if exists "Users can upsert own night streaks" on public.night_streaks;
create policy "Users can upsert own night streaks"
  on public.night_streaks for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own night streaks" on public.night_streaks;
create policy "Users can update own night streaks"
  on public.night_streaks for update
  using (auth.uid() = user_id);

-- Allow users to read their own badges
drop policy if exists "Users can read own night badges" on public.night_badges;
create policy "Users can read own night badges"
  on public.night_badges for select
  using (auth.uid() = user_id);

-- Allow inserts via upsert
drop policy if exists "Users can earn night badges" on public.night_badges;
create policy "Users can earn night badges"
  on public.night_badges for insert
  with check (auth.uid() = user_id);

-- ─── Functions ───────────────────────────────────────────────

-- Record a thought posted during night session
create or replace function public.record_night_thought()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ist_date date;
begin
  -- Calculate IST date (UTC+5:30)
  ist_date := (new.created_at at time zone 'utc' + interval '5 hours 30 minutes')::date;

  -- Upsert night_activity
  insert into public.night_activity (user_id, session_date, thoughts_posted)
  values (new.author_id, ist_date, 1)
  on conflict (user_id, session_date)
  do update set
    thoughts_posted = public.night_activity.thoughts_posted + 1,
    updated_at = now();

  return new;
end;
$$;

-- Trigger on night thought insert
drop trigger if exists trg_night_thought_insert on public.thoughts;
create trigger trg_night_thought_insert
  after insert on public.thoughts
  for each row
  when (new.is_night_thought = true)
  execute function public.record_night_thought();

-- Function to update a night streak
create or replace function public.update_night_streak(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  ist_date date;
  prev_date date;
  streak_val int;
begin
  ist_date := (now() at time zone 'utc' + interval '5 hours 30 minutes')::date;

  -- Get the current streak record
  select last_active_date, current_streak into prev_date, streak_val
  from public.night_streaks
  where user_id = p_user_id;

  if prev_date is null then
    -- First ever activity
    insert into public.night_streaks (user_id, current_streak, longest_streak, last_active_date)
    values (p_user_id, 1, 1, ist_date);
  elsif prev_date = ist_date then
    -- Already recorded today — just update timestamp
    update public.night_streaks set updated_at = now() where user_id = p_user_id;
  elsif prev_date = ist_date - 1 then
    -- Consecutive day
    streak_val := streak_val + 1;
    update public.night_streaks
    set current_streak = streak_val,
        longest_streak = greatest(longest_streak, streak_val),
        last_active_date = ist_date,
        updated_at = now()
    where user_id = p_user_id;
  else
    -- Streak broken — reset
    update public.night_streaks
    set current_streak = 1,
        last_active_date = ist_date,
        updated_at = now()
    where user_id = p_user_id;
  end if;
end;
$$;

-- Check and award night badges
create or replace function public.award_night_badges(p_user_id uuid)
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  post_count int;
  badge_ids text[] := '{}';
begin
  -- Count total night thoughts posted
  select count(*) into post_count
  from public.thoughts
  where author_id = p_user_id and is_night_thought = true;

  -- Award badges based on count (idempotent via on conflict)
  if post_count >= 20 then
    insert into public.night_badges (user_id, badge_id) values (p_user_id, 'nocturnal_sage') on conflict do nothing;
    badge_ids := array_append(badge_ids, 'nocturnal_sage');
  end if;
  if post_count >= 10 then
    insert into public.night_badges (user_id, badge_id) values (p_user_id, 'moon_child') on conflict do nothing;
    badge_ids := array_append(badge_ids, 'moon_child');
  end if;
  if post_count >= 5 then
    insert into public.night_badges (user_id, badge_id) values (p_user_id, 'night_thinker') on conflict do nothing;
    badge_ids := array_append(badge_ids, 'night_thinker');
  end if;
  if post_count >= 1 then
    insert into public.night_badges (user_id, badge_id) values (p_user_id, 'night_owl') on conflict do nothing;
    badge_ids := array_append(badge_ids, 'night_owl');
  end if;

  return badge_ids;
end;
$$;