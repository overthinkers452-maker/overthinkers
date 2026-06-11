-- Fix 1: Missing INSERT policy on conversations
-- Without this, no authenticated user can create a conversation.
drop policy if exists "Authenticated users can create conversations" on public.conversations;
create policy "Authenticated users can create conversations"
  on public.conversations
  for insert
  with check (auth.uid() is not null);

-- Fix 2: UPDATE policy on conversations (needed by sendMessage to touch updated_at)
drop policy if exists "Participants can update their conversations" on public.conversations;
create policy "Participants can update their conversations"
  on public.conversations
  for update
  using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = public.conversations.id and cp.user_id = auth.uid()
    )
  );

-- Fix 3: Replace the broken conversation_participants INSERT policy.
-- The old policy "Users can insert their own participant row" (user_id = auth.uid())
-- blocks inserting the OTHER participant's row in a batch insert.
-- Drop the old one and replace with a SECURITY DEFINER RPC that handles both rows.
drop policy if exists "Users can insert their own participant row" on public.conversation_participants;

-- Fix 4: SECURITY DEFINER function that creates a conversation and inserts BOTH
-- participant rows atomically, bypassing RLS for the other user's row.
-- Also handles the "get existing" case so callers don't need two round-trips.
create or replace function public.create_conversation(other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_id uuid;
  conv_id uuid;
begin
  -- Return existing 1-to-1 conversation if one already exists
  select cp1.conversation_id into existing_id
  from conversation_participants cp1
  join conversation_participants cp2
    on  cp1.conversation_id = cp2.conversation_id
    and cp2.user_id = other_user_id
  where cp1.user_id = auth.uid()
  limit 1;

  if existing_id is not null then
    return existing_id;
  end if;

  -- Create the conversation row
  insert into conversations default values returning id into conv_id;

  -- Insert both participants (SECURITY DEFINER bypasses the per-row check)
  insert into conversation_participants (conversation_id, user_id)
  values (conv_id, auth.uid()), (conv_id, other_user_id);

  return conv_id;
end;
$$;

-- Grant execute to authenticated users
grant execute on function public.create_conversation(uuid) to authenticated;

-- Realtime: enable the messages table so subscribeToMessages delivers live updates.
-- Run this if not already done:
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.messages';
  END IF;
END;
$$;
