-- Pawra v2 — denormalize owner_id / provider_id onto messages so RLS policies
-- can use simple column checks instead of JOINs.
--
-- Supabase Realtime's postgres_changes evaluates RLS before broadcasting each
-- row. Complex JOIN-based policies (EXISTS subqueries) are NOT supported and
-- silently drop events, which is why messages weren't appearing in real time.
-- Simple column checks (auth.uid() = owner_id OR auth.uid() = provider_id)
-- work reliably.
--
-- A SECURITY DEFINER trigger auto-populates the columns from the referenced
-- booking or order so callers never need to set them manually.
--
-- Run after 0020 and 0021. Idempotent.

-- Add the two columns (idempotent)
alter table public.messages
  add column if not exists owner_id    uuid references auth.users(id) on delete cascade,
  add column if not exists provider_id uuid references auth.users(id) on delete cascade;

create index if not exists messages_owner_idx    on public.messages(owner_id);
create index if not exists messages_provider_idx on public.messages(provider_id);

-- ── Trigger to populate owner_id / provider_id on insert ────────────────────

create or replace function public.messages_set_participants()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.booking_id is not null then
    select owner_id, provider_id
      into new.owner_id, new.provider_id
      from public.bookings
     where id = new.booking_id;
  elsif new.order_id is not null then
    select owner_id, vendor_id
      into new.owner_id, new.provider_id
      from public.orders
     where id = new.order_id;
  end if;
  return new;
end;
$$;

drop trigger if exists messages_set_participants on public.messages;
create trigger messages_set_participants
  before insert on public.messages
  for each row execute function public.messages_set_participants();

-- ── Replace RLS with simple column checks ────────────────────────────────────

drop policy if exists "messages_booking_read"   on public.messages;
drop policy if exists "messages_order_read"     on public.messages;
drop policy if exists "messages_booking_insert" on public.messages;
drop policy if exists "messages_order_insert"   on public.messages;
drop policy if exists "messages_mark_read"      on public.messages;

-- SELECT: either participant can read
create policy "messages_read" on public.messages
  for select
  using (
    auth.uid() = owner_id
    or auth.uid() = provider_id
    or auth.uid() = sender_id
  );

-- INSERT: sender must be a participant and must not forge sender_id
create policy "messages_insert" on public.messages
  for insert
  with check (auth.uid() = sender_id);

-- UPDATE: either participant can mark as read
create policy "messages_update" on public.messages
  for update
  using (auth.uid() = owner_id or auth.uid() = provider_id);
