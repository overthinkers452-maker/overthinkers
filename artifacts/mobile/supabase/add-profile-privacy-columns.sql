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

-- 4. Ban/suspend users (moderator + admin action)
alter table public.profiles
  add column if not exists is_banned boolean not null default false;

alter table public.profiles
  add column if not exists banned_reason text;

-- Prevent banned users from un-banning themselves via update
drop policy if exists "Users can update own profile (restricted fields)" on public.profiles;
create policy "Users can update own profile (restricted fields)" on public.profiles
  for update using (auth.uid() = id)
  with check (
    auth.uid() = id
    AND is_admin     = (SELECT p.is_admin     FROM public.profiles p WHERE p.id = auth.uid())
    AND is_moderator = (SELECT p.is_moderator FROM public.profiles p WHERE p.id = auth.uid())
    AND strike_count = (SELECT p.strike_count FROM public.profiles p WHERE p.id = auth.uid())
    AND is_banned    = (SELECT p.is_banned    FROM public.profiles p WHERE p.id = auth.uid())
  );

-- 5. 1-to-1 Chat Messaging

create table if not exists public.conversations (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.conversations enable row level security;

create table if not exists public.conversation_participants (
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  unread_count int not null default 0,
  last_read_at timestamptz,
  primary key (conversation_id, user_id)
);
alter table public.conversation_participants enable row level security;

create table if not exists public.messages (
  id uuid default uuid_generate_v4() primary key,
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete set null,
  content text not null check (length(content) between 1 and 2000),
  created_at timestamptz not null default now()
);
alter table public.messages enable row level security;

-- RLS: conversations visible to participants only
create policy "Participants can see their conversations" on public.conversations
  for select using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = id and cp.user_id = auth.uid()
    )
  );

-- RLS: participants can see their own participant row + others in their conversations
create policy "Participants can view conversation members" on public.conversation_participants
  for select using (
    exists (
      select 1 from public.conversation_participants me
      where me.conversation_id = conversation_participants.conversation_id and me.user_id = auth.uid()
    )
  );

create policy "Users can insert their own participant row" on public.conversation_participants
  for insert with check (user_id = auth.uid());

create policy "Users can update their own participant row" on public.conversation_participants
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- RLS: messages visible/insertable to conversation participants
create policy "Participants can read messages" on public.messages
  for select using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = messages.conversation_id and cp.user_id = auth.uid()
    )
  );

create policy "Participants can send messages" on public.messages
  for insert with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = messages.conversation_id and cp.user_id = auth.uid()
    )
  );

-- Realtime enabled on messages (run in Supabase Dashboard → Replication if needed)
-- alter publication supabase_realtime add table public.messages;

create index if not exists idx_messages_conversation_id on public.messages(conversation_id, created_at desc);
create index if not exists idx_conv_participants_user_id on public.conversation_participants(user_id);
