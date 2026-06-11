# COMPLETE AUDIT REPORT — Overthinkers

## 1. DATABASE SCHEMA ISSUES

### 1A. Missing Tables in TypeScript Database Types
The `Database` type in both `artifacts/mobile/lib/supabase.ts` and `artifacts/mobile/lib/supabase.native.ts` is missing these tables that are used in code:
- `night_activity` (used by `nightStatsService.ts`)
- `night_streaks` (used by `nightStatsService.ts`)
- `night_badges` (used by `nightStatsService.ts`)
- `user_sessions` (used by `thoughtsService.ts` lines 1185-1201)
- `conversations` (used by `thoughtsService.ts` lines 1036-1061)
- `conversation_participants` (used by `thoughtsService.ts` lines 1036-1104)
- `messages` (used by `thoughtsService.ts` lines 1122-1153)
- `realtime_test` (used by `supabase.native.ts` diagnostic)

### 1B. Missing Columns in TypeScript Database Types
- `profiles.is_banned` (used in `AuthContext.tsx` line 99)
- `profiles.banned_reason` (used in `AuthContext.tsx` line 100)
- `reports.dismissed_at` (used in `thoughtsService.ts` line 888)
- `reports.dismissed_by` (used in `thoughtsService.ts` line 888)

### 1C. Schema Fragmentation
3+ schema files overlap: `schema.sql`, `schema-v2.sql`, `schema-v3.sql`, `night_window_phase2.sql`, `fix-conversation-rls.sql`, `thought-media.sql`, `add-profile-privacy-columns.sql`
- Multiple conflicting definitions of RPCs like `admin_dismiss_reports`, `admin_remove_content`, `issue_user_strike`, `create_moderation_action`
- Night window tables created in migration but missing from master schemas

### 1D. Storage Bucket for "thought-media"
Code references `supabase.storage.from("thought-media")` in `thoughtsService.ts` line 1280, but no migration creates this bucket.

## 2. RLS POLICY BUGS

### 2A. Notification Insert Policy Broken
In `schema-v3.sql`, the notification insert policy was changed to: `auth.uid() = actor_id or actor_id is null`
But many code paths insert notifications where `actor_id` is the THOUGHT AUTHOR, not the current user:
- `toggleAppreciation()` line 265: `actor_id: userId` (current user IS the actor)
- `toggleFollow()` line 530: `actor_id: followerId` (current user IS the follower)
- `createComment()` line 440: `actor_id: params.authorId` (current user IS the author)
Wait - these ALL set actor_id to the current user. The thought author's ID is in `user_id` field. So this is actually correct. The policy `auth.uid() = actor_id` means the notification sender must be the authenticated user, which is correct.

### 2B. Night Window Tables Missing RLS
`night_activity`, `night_streaks`, `night_badges` created in `night_window_phase2.sql` - these NEED RLS for INSERT/UPDATE. The migration creates them but may not have been run.

## 3. CODE BUGS

### 3A. TypeScript Type Safety
- `thoughtsService.ts` uses `any` extensively for DB row mapping (lines 14-70, 72-90)
- `fetchNightThoughts` and other functions return `Thought[]` but use `any` casts
- `supabase.rpc()` called with `as any` throughout

### 3B. Dependency Chain Issue in AppContext.tsx
Line 374: `useEffect` depends on `[user, followingIds]` where `followingIds` is a string array - this is correctly referenced but the useEffect runs on every load even when already loaded.

### 3C. Missing Error Handling in Realtime Subscriptions
- `latenight.tsx` line 582-657: Realtime subscription doesn't handle subscription errors
- `AppContext.tsx` line 336-346: Notification realtime subscription has no error handling

## 4. CRITICAL FIX LIST

1. Add missing tables to Database type definitions
2. Add missing columns (is_banned, banned_reason, dismissed_at, dismissed_by)
3. Create "thought-media" storage bucket migration
4. Create consolidated migration for all missing objects
5. Fix TypeScript strictness with proper type imports
6. Ensure RLS policies exist for night tables