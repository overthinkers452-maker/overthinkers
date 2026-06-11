-- ============================================================
-- Overthinkers — RPC Helper Functions
-- Run AFTER schema.sql in your Supabase SQL editor
-- These are needed by the app to atomically update counters
-- ============================================================

-- ─── Thought counters ────────────────────────────────────────

create or replace function increment_thought_appreciations(thought_id uuid)
returns void language sql security definer as $$
  update thoughts set appreciations = appreciations + 1 where id = thought_id;
$$;

create or replace function decrement_thought_appreciations(thought_id uuid)
returns void language sql security definer as $$
  update thoughts set appreciations = greatest(0, appreciations - 1) where id = thought_id;
$$;

create or replace function increment_thought_disagreements(thought_id uuid)
returns void language sql security definer as $$
  update thoughts set disagreements = disagreements + 1 where id = thought_id;
$$;

create or replace function decrement_thought_disagreements(thought_id uuid)
returns void language sql security definer as $$
  update thoughts set disagreements = greatest(0, disagreements - 1) where id = thought_id;
$$;

create or replace function increment_thought_saves(thought_id uuid)
returns void language sql security definer as $$
  update thoughts set saves = saves + 1 where id = thought_id;
$$;

create or replace function decrement_thought_saves(thought_id uuid)
returns void language sql security definer as $$
  update thoughts set saves = greatest(0, saves - 1) where id = thought_id;
$$;

create or replace function increment_thought_reposts(thought_id uuid)
returns void language sql security definer as $$
  update thoughts set reposts = reposts + 1 where id = thought_id;
$$;

create or replace function decrement_thought_reposts(thought_id uuid)
returns void language sql security definer as $$
  update thoughts set reposts = greatest(0, reposts - 1) where id = thought_id;
$$;

create or replace function increment_thought_comments(thought_id uuid)
returns void language sql security definer as $$
  update thoughts set comments = comments + 1 where id = thought_id;
$$;

create or replace function increment_thought_reports(thought_id uuid)
returns void language sql security definer as $$
  update thoughts set report_count = report_count + 1 where id = thought_id;
$$;

-- ─── Comment counters ────────────────────────────────────────

create or replace function increment_comment_appreciations(comment_id uuid)
returns void language sql security definer as $$
  update comments set appreciations = appreciations + 1 where id = comment_id;
$$;

create or replace function decrement_comment_appreciations(comment_id uuid)
returns void language sql security definer as $$
  update comments set appreciations = greatest(0, appreciations - 1) where id = comment_id;
$$;

-- ─── Profile counters ────────────────────────────────────────

create or replace function increment_profile_thoughts(profile_id uuid)
returns void language sql security definer as $$
  update profiles set thoughts_count = thoughts_count + 1 where id = profile_id;
$$;

create or replace function decrement_profile_thoughts(profile_id uuid)
returns void language sql security definer as $$
  update profiles set thoughts_count = greatest(0, thoughts_count - 1) where id = profile_id;
$$;

-- ─── Follow counters ─────────────────────────────────────────

create or replace function increment_follow_counts(follower_id uuid, following_id uuid)
returns void language sql security definer as $$
  update profiles set following_count = following_count + 1 where id = follower_id;
  update profiles set followers_count = followers_count + 1 where id = following_id;
$$;

create or replace function decrement_follow_counts(follower_id uuid, following_id uuid)
returns void language sql security definer as $$
  update profiles set following_count = greatest(0, following_count - 1) where id = follower_id;
  update profiles set followers_count = greatest(0, followers_count - 1) where id = following_id;
$$;
