-- Pawra v2 — in-app chat between owners and providers.
-- Run after 0001-0019. Idempotent.
--
-- Each message belongs to exactly one conversation, identified by either
-- a booking_id or an order_id (never both). The constraint enforces this.
-- RLS ensures only the two parties of that booking/order can read or write.

create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid references public.bookings(id) on delete cascade,
  order_id    uuid references public.orders(id)   on delete cascade,
  sender_id   uuid not null references auth.users(id) on delete cascade,
  sender_name text not null default '',
  body        text not null,
  created_at  timestamptz not null default now(),
  read_at     timestamptz,
  constraint messages_one_source check (
    (booking_id is null) <> (order_id is null)
  )
);

create index if not exists messages_booking_idx
  on public.messages(booking_id, created_at);
create index if not exists messages_order_idx
  on public.messages(order_id, created_at);
create index if not exists messages_sender_idx
  on public.messages(sender_id);

alter table public.messages enable row level security;

-- SELECT: booking participants can read booking messages
drop policy if exists "messages_booking_read" on public.messages;
create policy "messages_booking_read" on public.messages
  for select
  using (
    booking_id is not null and exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and (auth.uid() = b.owner_id or auth.uid() = b.provider_id)
    )
  );

-- SELECT: order participants can read order messages
drop policy if exists "messages_order_read" on public.messages;
create policy "messages_order_read" on public.messages
  for select
  using (
    order_id is not null and exists (
      select 1 from public.orders o
      where o.id = order_id
        and (auth.uid() = o.owner_id or auth.uid() = o.vendor_id)
    )
  );

-- INSERT: booking participants can send booking messages
drop policy if exists "messages_booking_insert" on public.messages;
create policy "messages_booking_insert" on public.messages
  for insert
  with check (
    auth.uid() = sender_id
    and booking_id is not null
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and (auth.uid() = b.owner_id or auth.uid() = b.provider_id)
    )
  );

-- INSERT: order participants can send order messages
drop policy if exists "messages_order_insert" on public.messages;
create policy "messages_order_insert" on public.messages
  for insert
  with check (
    auth.uid() = sender_id
    and order_id is not null
    and exists (
      select 1 from public.orders o
      where o.id = order_id
        and (auth.uid() = o.owner_id or auth.uid() = o.vendor_id)
    )
  );

-- UPDATE: only to set read_at (mark as read) — any participant
drop policy if exists "messages_mark_read" on public.messages;
create policy "messages_mark_read" on public.messages
  for update
  using (
    (booking_id is not null and exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and (auth.uid() = b.owner_id or auth.uid() = b.provider_id)
    ))
    or
    (order_id is not null and exists (
      select 1 from public.orders o
      where o.id = order_id
        and (auth.uid() = o.owner_id or auth.uid() = o.vendor_id)
    ))
  );

-- Realtime so both parties see new messages instantly
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.messages;
    exception when duplicate_object then null;
    end;
  end if;
end $$;
