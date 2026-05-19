-- Pawra v2 — add recipient_id to messages for targeted realtime subscriptions.
-- Run after 0020. Idempotent.
--
-- Without a per-user filter, subscribing to the messages table in the global
-- realtime channel causes the channel to fail on RLS-enabled tables.
-- recipient_id lets AppContext subscribe with filter `recipient_id=eq.<uid>`
-- so each user only receives messages addressed to them.

alter table public.messages
  add column if not exists recipient_id uuid references auth.users(id) on delete cascade;

create index if not exists messages_recipient_idx
  on public.messages(recipient_id, read_at);
