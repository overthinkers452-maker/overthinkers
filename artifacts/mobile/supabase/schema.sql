-- ============================================================
-- Overthinkers — Complete Database Schema
-- Run this in your Supabase SQL Editor (one time setup)
-- ============================================================

-- ─── EXTENSIONS ──────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── PROFILES ────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  username text unique not null,
  display_name text not null,
  bio text default '',
  avatar_url text,
  banner_url text,
  reputation integer default 0,
  badge text default 'Newcomer',
  followers_count integer default 0,
  following_count integer default 0,
  thoughts_count integer default 0,
  username_changed_at timestamptz,
  push_token text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── THOUGHTS ────────────────────────────────────────────────────────────────
create table if not exists public.thoughts (
  id uuid default uuid_generate_v4() primary key,
  author_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  category text not null default 'General',
  posting_mode text not null default 'Public'
    check (posting_mode in ('Public', 'Pseudonymous', 'Anonymous')),
  alias text,
  type text not null default 'standard'
    check (type in ('standard', 'poll')),
  poll_data jsonb,
  appreciations integer default 0,
  disagreements integer default 0,
  reposts integer default 0,
  saves integer default 0,
  comments integer default 0,
  report_count integer default 0,
  quality_score numeric default 0,
  is_edited boolean default false,
  edited_at timestamptz,
  is_repost boolean default false,
  original_thought_id uuid,
  original_author_id uuid,
  is_night_thought boolean default false,
  feed_reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── COMMENTS ────────────────────────────────────────────────────────────────
create table if not exists public.comments (
  id uuid default uuid_generate_v4() primary key,
  thought_id uuid references public.thoughts(id) on delete cascade not null,
  author_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  posting_mode text not null default 'Public'
    check (posting_mode in ('Public', 'Pseudonymous', 'Anonymous')),
  alias text,
  parent_id uuid references public.comments(id) on delete cascade,
  depth integer default 0,
  appreciations integer default 0,
  report_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── APPRECIATIONS ───────────────────────────────────────────────────────────
create table if not exists public.appreciations (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  thought_id uuid references public.thoughts(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(user_id, thought_id)
);

-- ─── DISAGREEMENTS ───────────────────────────────────────────────────────────
create table if not exists public.disagreements (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  thought_id uuid references public.thoughts(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(user_id, thought_id)
);

-- ─── SAVES ───────────────────────────────────────────────────────────────────
create table if not exists public.saves (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  thought_id uuid references public.thoughts(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(user_id, thought_id)
);

-- ─── REPOSTS ─────────────────────────────────────────────────────────────────
create table if not exists public.reposts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  thought_id uuid references public.thoughts(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(user_id, thought_id)
);

-- ─── FOLLOWS ─────────────────────────────────────────────────────────────────
create table if not exists public.follows (
  id uuid default uuid_generate_v4() primary key,
  follower_id uuid references public.profiles(id) on delete cascade not null,
  following_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(follower_id, following_id)
);

-- ─── BLOCKS ──────────────────────────────────────────────────────────────────
create table if not exists public.blocks (
  id uuid default uuid_generate_v4() primary key,
  blocker_id uuid references public.profiles(id) on delete cascade not null,
  blocked_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(blocker_id, blocked_id)
);

-- ─── NOTIFICATIONS ───────────────────────────────────────────────────────────
create table if not exists public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null
    check (type in ('appreciation', 'comment', 'repost', 'follow', 'badge', 'reply')),
  actor_id uuid references public.profiles(id) on delete set null,
  thought_id uuid references public.thoughts(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  read boolean default false,
  created_at timestamptz default now()
);

-- ─── REPORTS ─────────────────────────────────────────────────────────────────
create table if not exists public.reports (
  id uuid default uuid_generate_v4() primary key,
  reporter_id uuid references public.profiles(id) on delete cascade not null,
  thought_id uuid references public.thoughts(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  reason text not null,
  description text,
  created_at timestamptz default now()
);

-- ─── POLL VOTES ──────────────────────────────────────────────────────────────
create table if not exists public.poll_votes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  thought_id uuid references public.thoughts(id) on delete cascade not null,
  option_index integer not null,
  created_at timestamptz default now(),
  unique(user_id, thought_id)
);

-- ─── COMMENT APPRECIATIONS ───────────────────────────────────────────────────
create table if not exists public.comment_appreciations (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  comment_id uuid references public.comments(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(user_id, comment_id)
);

-- ─── INDEXES ─────────────────────────────────────────────────────────────────
create index if not exists thoughts_author_id_idx on public.thoughts(author_id);
create index if not exists thoughts_created_at_idx on public.thoughts(created_at desc);
create index if not exists thoughts_quality_score_idx on public.thoughts(quality_score desc);
create index if not exists thoughts_appreciations_idx on public.thoughts(appreciations desc);
create index if not exists thoughts_night_idx on public.thoughts(is_night_thought, created_at desc);
create index if not exists thoughts_content_search_idx on public.thoughts using gin(to_tsvector('english', content));
create index if not exists comments_thought_id_idx on public.comments(thought_id);
create index if not exists comments_author_id_idx on public.comments(author_id);
create index if not exists notifications_user_id_idx on public.notifications(user_id, created_at desc);
create index if not exists notifications_unread_idx on public.notifications(user_id, read) where read = false;
create index if not exists follows_follower_idx on public.follows(follower_id);
create index if not exists follows_following_idx on public.follows(following_id);

-- ─── TRIGGER: auto-create profile on signup ──────────────────────────────────
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'username',
      split_part(new.email, '@', 1)
    ),
    coalesce(
      new.raw_user_meta_data->>'display_name',
      new.raw_user_meta_data->>'username',
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── TRIGGER: updated_at ─────────────────────────────────────────────────────
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_profiles_updated_at on public.profiles;
create trigger update_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.update_updated_at_column();

drop trigger if exists update_thoughts_updated_at on public.thoughts;
create trigger update_thoughts_updated_at
  before update on public.thoughts
  for each row execute procedure public.update_updated_at_column();

drop trigger if exists update_comments_updated_at on public.comments;
create trigger update_comments_updated_at
  before update on public.comments
  for each row execute procedure public.update_updated_at_column();

-- ─── RPCs ────────────────────────────────────────────────────────────────────

create or replace function public.increment_profile_thoughts(profile_id uuid)
returns void language sql security definer as $$
  update public.profiles set thoughts_count = thoughts_count + 1 where id = profile_id;
$$;

create or replace function public.decrement_profile_thoughts(profile_id uuid)
returns void language sql security definer as $$
  update public.profiles set thoughts_count = greatest(0, thoughts_count - 1) where id = profile_id;
$$;

create or replace function public.increment_thought_appreciations(thought_id uuid)
returns void language sql security definer as $$
  update public.thoughts set appreciations = appreciations + 1 where id = thought_id;
$$;

create or replace function public.decrement_thought_appreciations(thought_id uuid)
returns void language sql security definer as $$
  update public.thoughts set appreciations = greatest(0, appreciations - 1) where id = thought_id;
$$;

create or replace function public.increment_thought_disagreements(thought_id uuid)
returns void language sql security definer as $$
  update public.thoughts set disagreements = disagreements + 1 where id = thought_id;
$$;

create or replace function public.decrement_thought_disagreements(thought_id uuid)
returns void language sql security definer as $$
  update public.thoughts set disagreements = greatest(0, disagreements - 1) where id = thought_id;
$$;

create or replace function public.increment_thought_saves(thought_id uuid)
returns void language sql security definer as $$
  update public.thoughts set saves = saves + 1 where id = thought_id;
$$;

create or replace function public.decrement_thought_saves(thought_id uuid)
returns void language sql security definer as $$
  update public.thoughts set saves = greatest(0, saves - 1) where id = thought_id;
$$;

create or replace function public.increment_thought_reposts(thought_id uuid)
returns void language sql security definer as $$
  update public.thoughts set reposts = reposts + 1 where id = thought_id;
$$;

create or replace function public.decrement_thought_reposts(thought_id uuid)
returns void language sql security definer as $$
  update public.thoughts set reposts = greatest(0, reposts - 1) where id = thought_id;
$$;

create or replace function public.increment_thought_comments(thought_id uuid)
returns void language sql security definer as $$
  update public.thoughts set comments = comments + 1 where id = thought_id;
$$;

create or replace function public.decrement_thought_comments(thought_id uuid)
returns void language sql security definer as $$
  update public.thoughts set comments = greatest(0, comments - 1) where id = thought_id;
$$;

create or replace function public.increment_thought_reports(thought_id uuid)
returns void language sql security definer as $$
  update public.thoughts set report_count = report_count + 1 where id = thought_id;
$$;

create or replace function public.increment_follow_counts(follower_id uuid, following_id uuid)
returns void language plpgsql security definer as $$
begin
  update public.profiles set following_count = following_count + 1 where id = follower_id;
  update public.profiles set followers_count = followers_count + 1 where id = following_id;
end;
$$;

create or replace function public.decrement_follow_counts(follower_id uuid, following_id uuid)
returns void language plpgsql security definer as $$
begin
  update public.profiles set following_count = greatest(0, following_count - 1) where id = follower_id;
  update public.profiles set followers_count = greatest(0, followers_count - 1) where id = following_id;
end;
$$;

create or replace function public.increment_comment_appreciations(comment_id uuid)
returns void language sql security definer as $$
  update public.comments set appreciations = appreciations + 1 where id = comment_id;
$$;

create or replace function public.decrement_comment_appreciations(comment_id uuid)
returns void language sql security definer as $$
  update public.comments set appreciations = greatest(0, appreciations - 1) where id = comment_id;
$$;

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.thoughts enable row level security;
alter table public.comments enable row level security;
alter table public.appreciations enable row level security;
alter table public.disagreements enable row level security;
alter table public.saves enable row level security;
alter table public.reposts enable row level security;
alter table public.follows enable row level security;
alter table public.blocks enable row level security;
alter table public.notifications enable row level security;
alter table public.reports enable row level security;
alter table public.poll_votes enable row level security;
alter table public.comment_appreciations enable row level security;

-- PROFILES
drop policy if exists "Profiles are viewable by everyone" on public.profiles;
create policy "Profiles are viewable by everyone" on public.profiles for select using (true);
drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile" on public.profiles for update using (auth.uid() = id);
drop policy if exists "Users can delete their own profile" on public.profiles;
create policy "Users can delete their own profile" on public.profiles for delete using (auth.uid() = id);

-- THOUGHTS
drop policy if exists "Thoughts are viewable by everyone" on public.thoughts;
create policy "Thoughts are viewable by everyone" on public.thoughts for select using (true);
drop policy if exists "Authenticated users can create thoughts" on public.thoughts;
create policy "Authenticated users can create thoughts" on public.thoughts for insert with check (auth.uid() = author_id);
drop policy if exists "Users can update their own thoughts" on public.thoughts;
create policy "Users can update their own thoughts" on public.thoughts for update using (auth.uid() = author_id);
drop policy if exists "Users can delete their own thoughts" on public.thoughts;
create policy "Users can delete their own thoughts" on public.thoughts for delete using (auth.uid() = author_id);

-- COMMENTS
drop policy if exists "Comments are viewable by everyone" on public.comments;
create policy "Comments are viewable by everyone" on public.comments for select using (true);
drop policy if exists "Authenticated users can create comments" on public.comments;
create policy "Authenticated users can create comments" on public.comments for insert with check (auth.uid() = author_id);
drop policy if exists "Users can update their own comments" on public.comments;
create policy "Users can update their own comments" on public.comments for update using (auth.uid() = author_id);
drop policy if exists "Users can delete their own comments" on public.comments;
create policy "Users can delete their own comments" on public.comments for delete using (auth.uid() = author_id);

-- APPRECIATIONS
drop policy if exists "Appreciations are viewable by everyone" on public.appreciations;
create policy "Appreciations are viewable by everyone" on public.appreciations for select using (true);
drop policy if exists "Authenticated users can appreciate" on public.appreciations;
create policy "Authenticated users can appreciate" on public.appreciations for insert with check (auth.uid() = user_id);
drop policy if exists "Users can remove their own appreciations" on public.appreciations;
create policy "Users can remove their own appreciations" on public.appreciations for delete using (auth.uid() = user_id);

-- DISAGREEMENTS
drop policy if exists "Disagreements are viewable by everyone" on public.disagreements;
create policy "Disagreements are viewable by everyone" on public.disagreements for select using (true);
drop policy if exists "Authenticated users can disagree" on public.disagreements;
create policy "Authenticated users can disagree" on public.disagreements for insert with check (auth.uid() = user_id);
drop policy if exists "Users can remove their own disagreements" on public.disagreements;
create policy "Users can remove their own disagreements" on public.disagreements for delete using (auth.uid() = user_id);

-- SAVES
drop policy if exists "Users can see their own saves" on public.saves;
create policy "Users can see their own saves" on public.saves for select using (auth.uid() = user_id);
drop policy if exists "Authenticated users can save" on public.saves;
create policy "Authenticated users can save" on public.saves for insert with check (auth.uid() = user_id);
drop policy if exists "Users can remove their own saves" on public.saves;
create policy "Users can remove their own saves" on public.saves for delete using (auth.uid() = user_id);

-- REPOSTS
drop policy if exists "Reposts are viewable by everyone" on public.reposts;
create policy "Reposts are viewable by everyone" on public.reposts for select using (true);
drop policy if exists "Authenticated users can repost" on public.reposts;
create policy "Authenticated users can repost" on public.reposts for insert with check (auth.uid() = user_id);
drop policy if exists "Users can remove their own reposts" on public.reposts;
create policy "Users can remove their own reposts" on public.reposts for delete using (auth.uid() = user_id);

-- FOLLOWS
drop policy if exists "Follows are viewable by everyone" on public.follows;
create policy "Follows are viewable by everyone" on public.follows for select using (true);
drop policy if exists "Authenticated users can follow" on public.follows;
create policy "Authenticated users can follow" on public.follows for insert with check (auth.uid() = follower_id);
drop policy if exists "Users can unfollow" on public.follows;
create policy "Users can unfollow" on public.follows for delete using (auth.uid() = follower_id);

-- BLOCKS
drop policy if exists "Users can see their own blocks" on public.blocks;
create policy "Users can see their own blocks" on public.blocks for select using (auth.uid() = blocker_id);
drop policy if exists "Authenticated users can block" on public.blocks;
create policy "Authenticated users can block" on public.blocks for insert with check (auth.uid() = blocker_id);
drop policy if exists "Users can unblock" on public.blocks;
create policy "Users can unblock" on public.blocks for delete using (auth.uid() = blocker_id);

-- NOTIFICATIONS
drop policy if exists "Users can see their own notifications" on public.notifications;
create policy "Users can see their own notifications" on public.notifications for select using (auth.uid() = user_id);
drop policy if exists "Service role can create notifications" on public.notifications;
create policy "Service role can create notifications" on public.notifications for insert with check (auth.role() = 'authenticated');
drop policy if exists "Users can update their own notifications" on public.notifications;
create policy "Users can update their own notifications" on public.notifications for update using (auth.uid() = user_id);

-- REPORTS
drop policy if exists "Users can see their own reports" on public.reports;
create policy "Users can see their own reports" on public.reports for select using (auth.uid() = reporter_id);
drop policy if exists "Authenticated users can report" on public.reports;
create policy "Authenticated users can report" on public.reports for insert with check (auth.uid() = reporter_id);

-- POLL VOTES
drop policy if exists "Poll votes are viewable by everyone" on public.poll_votes;
create policy "Poll votes are viewable by everyone" on public.poll_votes for select using (true);
drop policy if exists "Authenticated users can vote" on public.poll_votes;
create policy "Authenticated users can vote" on public.poll_votes for insert with check (auth.uid() = user_id);

-- COMMENT APPRECIATIONS
drop policy if exists "Comment appreciations are viewable by everyone" on public.comment_appreciations;
create policy "Comment appreciations are viewable by everyone" on public.comment_appreciations for select using (true);
drop policy if exists "Authenticated users can appreciate comments" on public.comment_appreciations;
create policy "Authenticated users can appreciate comments" on public.comment_appreciations for insert with check (auth.uid() = user_id);
drop policy if exists "Users can remove their own comment appreciations" on public.comment_appreciations;
create policy "Users can remove their own comment appreciations" on public.comment_appreciations for delete using (auth.uid() = user_id);

-- ─── REALTIME ────────────────────────────────────────────────────────────────
-- Enable realtime for live feeds and notifications
alter publication supabase_realtime add table public.thoughts;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.comments;

-- ─── MIGRATION: Privacy columns ──────────────────────────────────────────────
alter table public.profiles add column if not exists is_private boolean default false;
alter table public.profiles add column if not exists hide_appreciations boolean default false;
alter table public.profiles add column if not exists hide_reposts boolean default false;

-- ─── MIGRATION: Admin & Moderation ───────────────────────────────────────────
alter table public.profiles add column if not exists is_admin boolean default false;
alter table public.profiles add column if not exists strike_count integer default 0;

-- ─── MIGRATION: Notifications — add mention type + message column ─────────────
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('appreciation', 'comment', 'repost', 'follow', 'badge', 'reply', 'mention', 'system'));
alter table public.notifications add column if not exists message text;

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
create policy "Users can see their own mutes" on public.mutes for select using (auth.uid() = muter_id);
drop policy if exists "Authenticated users can mute" on public.mutes;
create policy "Authenticated users can mute" on public.mutes for insert with check (auth.uid() = muter_id);
drop policy if exists "Users can unmute" on public.mutes;
create policy "Users can unmute" on public.mutes for delete using (auth.uid() = muter_id);

-- ─── SECURITY LOGS ───────────────────────────────────────────────────────────
create table if not exists public.security_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  event_type text not null check (event_type in ('login_success','login_fail','password_change','signout','signup')),
  metadata jsonb,
  created_at timestamptz default now()
);

alter table public.security_logs enable row level security;
drop policy if exists "Users can see their own security logs" on public.security_logs;
create policy "Users can see their own security logs" on public.security_logs for select using (auth.uid() = user_id);
drop policy if exists "Authenticated users can insert security logs" on public.security_logs;
create policy "Authenticated users can insert security logs" on public.security_logs for insert with check (auth.uid() = user_id);

-- ─── HASHTAGS ────────────────────────────────────────────────────────────────
create table if not exists public.hashtags (
  id uuid default uuid_generate_v4() primary key,
  tag text unique not null,
  usage_count integer default 0,
  created_at timestamptz default now()
);

create table if not exists public.thought_hashtags (
  id uuid default uuid_generate_v4() primary key,
  thought_id uuid references public.thoughts(id) on delete cascade not null,
  hashtag_id uuid references public.hashtags(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(thought_id, hashtag_id)
);

create index if not exists hashtags_tag_idx on public.hashtags(tag);
create index if not exists hashtags_usage_idx on public.hashtags(usage_count desc);
create index if not exists thought_hashtags_hashtag_id_idx on public.thought_hashtags(hashtag_id);
create index if not exists thought_hashtags_thought_id_idx on public.thought_hashtags(thought_id);

alter table public.hashtags enable row level security;
drop policy if exists "Hashtags are viewable by everyone" on public.hashtags;
create policy "Hashtags are viewable by everyone" on public.hashtags for select using (true);
drop policy if exists "Authenticated users can insert hashtags" on public.hashtags;
create policy "Authenticated users can insert hashtags" on public.hashtags for insert with check (auth.role() = 'authenticated');
drop policy if exists "Authenticated users can update hashtags" on public.hashtags;
create policy "Authenticated users can update hashtags" on public.hashtags for update using (auth.role() = 'authenticated');

alter table public.thought_hashtags enable row level security;
drop policy if exists "Thought hashtags are viewable by everyone" on public.thought_hashtags;
create policy "Thought hashtags are viewable by everyone" on public.thought_hashtags for select using (true);
drop policy if exists "Authenticated users can link hashtags" on public.thought_hashtags;
create policy "Authenticated users can link hashtags" on public.thought_hashtags for insert with check (auth.role() = 'authenticated');
drop policy if exists "Authenticated users can delete hashtag links" on public.thought_hashtags;
create policy "Authenticated users can delete hashtag links" on public.thought_hashtags for delete using (
  exists (select 1 from public.thoughts where id = thought_id and author_id = auth.uid())
);

-- ─── MODERATION ACTIONS ──────────────────────────────────────────────────────
create table if not exists public.moderation_actions (
  id uuid default uuid_generate_v4() primary key,
  moderator_id uuid references public.profiles(id) on delete set null,
  target_type text not null check (target_type in ('thought', 'comment', 'user')),
  target_id uuid not null,
  action text not null check (action in ('dismiss', 'remove', 'warn', 'ban')),
  note text,
  created_at timestamptz default now()
);

alter table public.moderation_actions enable row level security;
drop policy if exists "Admins can see moderation actions" on public.moderation_actions;
create policy "Admins can see moderation actions" on public.moderation_actions
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- ─── USER STRIKES ────────────────────────────────────────────────────────────
create table if not exists public.user_strikes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  reason text not null,
  issued_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

alter table public.user_strikes enable row level security;
drop policy if exists "Users and admins can see strikes" on public.user_strikes;
create policy "Users and admins can see strikes" on public.user_strikes
  for select using (
    auth.uid() = user_id
    or exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- ─── ADMIN RPCs (security definer — only callable by admins) ─────────────────

create or replace function public.create_moderation_action(
  p_target_type text,
  p_target_id uuid,
  p_action text,
  p_note text default null
)
returns uuid language plpgsql security definer as $$
declare
  v_id uuid;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin = true) then
    raise exception 'Unauthorized: admin access required';
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
returns void language plpgsql security definer as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin = true) then
    raise exception 'Unauthorized: admin access required';
  end if;
  insert into public.user_strikes (user_id, reason, issued_by)
  values (p_user_id, p_reason, auth.uid());
  insert into public.moderation_actions (moderator_id, target_type, target_id, action, note)
  values (auth.uid(), 'user', p_user_id, 'warn', p_reason);
  update public.profiles set strike_count = strike_count + 1 where id = p_user_id;
end;
$$;

-- ─── SECURITY: restrict privileged profile columns from self-update ───────────
-- Override the broad update policy so users cannot flip is_admin or alter
-- strike_count on their own row (only security-definer RPCs may change these).
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile" on public.profiles
  for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    AND is_admin  = (SELECT p.is_admin  FROM public.profiles p WHERE p.id = auth.uid())
    AND strike_count = (SELECT p.strike_count FROM public.profiles p WHERE p.id = auth.uid())
  );

-- ─── REPORTS: let admins read the full report queue ───────────────────────────
drop policy if exists "Users can see their own reports" on public.reports;
drop policy if exists "Admins can read all reports" on public.reports;
create policy "Reports select" on public.reports
  for select using (
    auth.uid() = reporter_id
    OR exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );
