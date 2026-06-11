-- ============================================================================
-- 005: Verification queries - Run these against Supabase to confirm all objects exist
-- ============================================================================
-- USAGE: Copy each query block and run it in Supabase SQL Editor
-- All queries should return rows for a healthy database.

-- ── 1. ALL TABLES ───────────────────────────────────────────────────────────
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' ORDER BY table_name;
-- Expected: comments, conversations, conversation_participants, follows,
-- hourly_thoughts, messages, notifications, poll_votes, polls, profiles,
-- reactions, reports, saved_thoughts, thoughts

-- ── 2. TABLES WITH COLUMNS ──────────────────────────────────────────────────
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- ── 3. ALL RLS POLICIES ────────────────────────────────────────────────────
SELECT schemaname, tablename, policyname, cmd, roles
FROM pg_policies WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ── 4. ALL TRIGGERS ────────────────────────────────────────────────────────
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- ── 5. REALTIME PUBLICATIONS ────────────────────────────────────────────────
SELECT * FROM pg_publication_tables WHERE schemaname = 'public';

-- ── 6. STORAGE BUCKETS ─────────────────────────────────────────────────────
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets ORDER BY name;

-- ── 7. STORAGE POLICIES ────────────────────────────────────────────────────
SELECT bucket_id, name, definition, operation
FROM storage.policies ORDER BY bucket_id, name;

-- ── 8. FUNCTIONS ───────────────────────────────────────────────────────────
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public' ORDER BY routine_name;