-- Run this in the Supabase SQL Editor.
-- Adds the three profile columns referenced by all thought-fetch queries.
-- Safe to run multiple times (IF NOT EXISTS).

alter table public.profiles
  add column if not exists hide_appreciations boolean not null default false;

alter table public.profiles
  add column if not exists hide_reposts boolean not null default false;

alter table public.profiles
  add column if not exists strike_count integer not null default 0;
