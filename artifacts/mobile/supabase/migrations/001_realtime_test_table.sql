-- ============================================================
-- Realtime Diagnostic: Create test table and add to publication
-- ============================================================

-- Create the realtime_test table for diagnostics
create table if not exists public.realtime_test (
  id bigint generated always as identity primary key,
  message text,
  created_at timestamptz default now()
);

-- Add realtime_test to the supabase_realtime publication
alter publication supabase_realtime add table public.realtime_test;

-- Enable RLS on the diagnostic table
alter table public.realtime_test enable row level security;

-- Allow all users to read/write for diagnostic purposes
drop policy if exists "Enable all for diagnostics" on public.realtime_test;
create policy "Enable all for diagnostics"
  on public.realtime_test
  for all
  using (true)
  with check (true);