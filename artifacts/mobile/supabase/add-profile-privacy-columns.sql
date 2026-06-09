-- Run this in the Supabase SQL Editor to fix the missing profile columns
-- that cause thought creation and feed loading to fail.

alter table public.profiles
  add column if not exists hide_appreciations boolean not null default false;

alter table public.profiles
  add column if not exists hide_reposts boolean not null default false;
