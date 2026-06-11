-- ============================================================
-- Overthinkers — Supabase Production Schema
-- Run this in your Supabase SQL editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── PROFILES ────────────────────────────────────────────────
create table if not exists profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  username        text unique not null,
  display_name    text not null,
  bio             text default '',
  avatar_url      text,
  banner_url      text,
  reputation      int not null default 0,
  badge           text not null default 'Newcomer',
  followers_count int not null default 0,
  following_count int not null default 0,
  thoughts_count  int not null default 0,
  username_changed_at timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ─── THOUGHTS ────────────────────────────────────────────────
create table if not exists thoughts (
  id                  uuid primary key default uuid_generate_v4(),
  author_id           uuid not null references profiles(id) on delete cascade,
  content             text not null check (char_length(content) <= 500),
  category            text not null default 'Philosophy',
  posting_mode        text not null check (posting_mode in ('Public','Pseudonymous','Anonymous')),
  alias               text,
  type                text not null default 'standard' check (type in ('standard','poll')),
  poll_data           jsonb,
  appreciations       int not null default 0,
  disagreements       int not null default 0,
  reposts             int not null default 0,
  saves               int not null default 0,
  comments            int not null default 0,
  report_count        int not null default 0,
  quality_score       float not null default 0,
  is_edited           boolean not null default false,
  edited_at           timestamptz,
  is_repost           boolean not null default false,
  original_thought_id uuid references thoughts(id) on delete set null,
  original_author_id  uuid references profiles(id) on delete set null,
  is_night_thought    boolean not null default false,
  feed_reason         text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ─── COMMENTS ────────────────────────────────────────────────
create table if not exists comments (
  id           uuid primary key default uuid_generate_v4(),
  thought_id   uuid not null references thoughts(id) on delete cascade,
  author_id    uuid not null references profiles(id) on delete cascade,
  content      text not null check (char_length(content) <= 500),
  posting_mode text not null check (posting_mode in ('Public','Pseudonymous','Anonymous')),
  alias        text,
  parent_id    uuid references comments(id) on delete cascade,
  depth        int not null default 0,
  appreciations int not null default 0,
  report_count  int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ─── APPRECIATIONS ───────────────────────────────────────────
create table if not exists appreciations (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references profiles(id) on delete cascade,
  thought_id uuid not null references thoughts(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, thought_id)
);

-- ─── DISAGREEMENTS ───────────────────────────────────────────
create table if not exists disagreements (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references profiles(id) on delete cascade,
  thought_id uuid not null references thoughts(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, thought_id)
);

-- ─── SAVES / BOOKMARKS ───────────────────────────────────────
create table if not exists saves (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references profiles(id) on delete cascade,
  thought_id uuid not null references thoughts(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, thought_id)
);

-- ─── REPOSTS ─────────────────────────────────────────────────
create table if not exists reposts (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references profiles(id) on delete cascade,
  thought_id uuid not null references thoughts(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, thought_id)
);

-- ─── FOLLOWS ─────────────────────────────────────────────────
create table if not exists follows (
  id           uuid primary key default uuid_generate_v4(),
  follower_id  uuid not null references profiles(id) on delete cascade,
  following_id uuid not null references profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique(follower_id, following_id),
  check (follower_id != following_id)
);

-- ─── NOTIFICATIONS ───────────────────────────────────────────
create table if not exists notifications (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references profiles(id) on delete cascade,
  type       text not null check (type in ('appreciation','comment','repost','follow','badge','reply')),
  actor_id   uuid references profiles(id) on delete set null,
  thought_id uuid references thoughts(id) on delete cascade,
  comment_id uuid references comments(id) on delete cascade,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

-- ─── REPORTS ─────────────────────────────────────────────────
create table if not exists reports (
  id          uuid primary key default uuid_generate_v4(),
  reporter_id uuid not null references profiles(id) on delete cascade,
  thought_id  uuid references thoughts(id) on delete cascade,
  comment_id  uuid references comments(id) on delete cascade,
  reason      text not null,
  description text,
  created_at  timestamptz not null default now()
);

-- ─── BLOCKS ──────────────────────────────────────────────────
create table if not exists blocks (
  id         uuid primary key default uuid_generate_v4(),
  blocker_id uuid not null references profiles(id) on delete cascade,
  blocked_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(blocker_id, blocked_id),
  check (blocker_id != blocked_id)
);

-- ─── POLL VOTES ──────────────────────────────────────────────
create table if not exists poll_votes (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references profiles(id) on delete cascade,
  thought_id   uuid not null references thoughts(id) on delete cascade,
  option_index int not null,
  created_at   timestamptz not null default now(),
  unique(user_id, thought_id)
);

-- ─── COMMENT APPRECIATIONS ───────────────────────────────────
create table if not exists comment_appreciations (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references profiles(id) on delete cascade,
  comment_id uuid not null references comments(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, comment_id)
);

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists thoughts_author_id_idx on thoughts(author_id);
create index if not exists thoughts_created_at_idx on thoughts(created_at desc);
create index if not exists thoughts_quality_score_idx on thoughts(quality_score desc);
create index if not exists thoughts_category_idx on thoughts(category);
create index if not exists thoughts_is_night_idx on thoughts(is_night_thought);
create index if not exists comments_thought_id_idx on comments(thought_id);
create index if not exists comments_parent_id_idx on comments(parent_id);
create index if not exists notifications_user_id_idx on notifications(user_id);
create index if not exists notifications_read_idx on notifications(user_id, read);
create index if not exists follows_follower_idx on follows(follower_id);
create index if not exists follows_following_idx on follows(following_id);
create index if not exists blocks_blocker_idx on blocks(blocker_id);

-- Full-text search indexes
create index if not exists thoughts_content_fts on thoughts using gin(to_tsvector('english', content));
create index if not exists profiles_username_fts on profiles using gin(to_tsvector('english', username || ' ' || display_name));

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table profiles enable row level security;
alter table thoughts enable row level security;
alter table comments enable row level security;
alter table appreciations enable row level security;
alter table disagreements enable row level security;
alter table saves enable row level security;
alter table reposts enable row level security;
alter table follows enable row level security;
alter table notifications enable row level security;
alter table reports enable row level security;
alter table blocks enable row level security;
alter table poll_votes enable row level security;
alter table comment_appreciations enable row level security;

-- Profiles: public read, owner write
create policy "Profiles are publicly readable" on profiles for select using (true);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- Thoughts: public read (except anon mode hides author), owner can CRUD
create policy "Thoughts are publicly readable" on thoughts for select using (true);
create policy "Authenticated users can create thoughts" on thoughts for insert with check (auth.uid() = author_id);
create policy "Authors can update own thoughts" on thoughts for update using (auth.uid() = author_id);
create policy "Authors can delete own thoughts" on thoughts for delete using (auth.uid() = author_id);

-- Comments: public read, auth write, owner delete
create policy "Comments are publicly readable" on comments for select using (true);
create policy "Authenticated users can comment" on comments for insert with check (auth.role() = 'authenticated');
create policy "Authors can update own comments" on comments for update using (auth.uid() = author_id);
create policy "Authors can delete own comments" on comments for delete using (auth.uid() = author_id);

-- Appreciations
create policy "Appreciations are publicly readable" on appreciations for select using (true);
create policy "Users can appreciate" on appreciations for insert with check (auth.uid() = user_id);
create policy "Users can un-appreciate" on appreciations for delete using (auth.uid() = user_id);

-- Disagreements
create policy "Disagreements are publicly readable" on disagreements for select using (true);
create policy "Users can disagree" on disagreements for insert with check (auth.uid() = user_id);
create policy "Users can un-disagree" on disagreements for delete using (auth.uid() = user_id);

-- Saves
create policy "Users can view own saves" on saves for select using (auth.uid() = user_id);
create policy "Users can save" on saves for insert with check (auth.uid() = user_id);
create policy "Users can unsave" on saves for delete using (auth.uid() = user_id);

-- Reposts
create policy "Reposts are publicly readable" on reposts for select using (true);
create policy "Users can repost" on reposts for insert with check (auth.uid() = user_id);
create policy "Users can un-repost" on reposts for delete using (auth.uid() = user_id);

-- Follows
create policy "Follows are publicly readable" on follows for select using (true);
create policy "Users can follow" on follows for insert with check (auth.uid() = follower_id);
create policy "Users can unfollow" on follows for delete using (auth.uid() = follower_id);

-- Notifications: private to owner
create policy "Users see own notifications" on notifications for select using (auth.uid() = user_id);
create policy "System can insert notifications" on notifications for insert with check (true);
create policy "Users can mark own notifications read" on notifications for update using (auth.uid() = user_id);

-- Reports: auth insert only
create policy "Authenticated users can report" on reports for insert with check (auth.uid() = reporter_id);
create policy "Users can view own reports" on reports for select using (auth.uid() = reporter_id);

-- Blocks: private to blocker
create policy "Users can view own blocks" on blocks for select using (auth.uid() = blocker_id);
create policy "Users can block" on blocks for insert with check (auth.uid() = blocker_id);
create policy "Users can unblock" on blocks for delete using (auth.uid() = blocker_id);

-- Poll votes
create policy "Poll votes are publicly readable" on poll_votes for select using (true);
create policy "Users can vote" on poll_votes for insert with check (auth.uid() = user_id);

-- Comment appreciations
create policy "Comment appreciations readable" on comment_appreciations for select using (true);
create policy "Users can appreciate comments" on comment_appreciations for insert with check (auth.uid() = user_id);
create policy "Users can un-appreciate comments" on comment_appreciations for delete using (auth.uid() = user_id);

-- ============================================================
-- TRIGGERS: auto-create profile on sign-up
-- ============================================================

create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into profiles (id, username, display_name, bio)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substring(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'username', 'New Thinker'),
    ''
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- TRIGGERS: updated_at timestamps
-- ============================================================

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger thoughts_updated_at before update on thoughts for each row execute procedure set_updated_at();
create trigger comments_updated_at before update on comments for each row execute procedure set_updated_at();
create trigger profiles_updated_at before update on profiles for each row execute procedure set_updated_at();
