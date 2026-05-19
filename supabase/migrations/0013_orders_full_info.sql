-- Pawra v2 — orders carry the full info needed for the provider inbox.
-- Run after 0001-0012. Idempotent.
--
-- Adds owner_name, items (line items), address, payment_method, note,
-- responded_at. Extends status check to include 'confirmed' and 'declined'
-- so the orders inbox can mirror the bookings inbox flow.

alter table public.orders
  add column if not exists owner_name      text not null default '',
  add column if not exists items           jsonb not null default '[]'::jsonb,
  add column if not exists address         jsonb,
  add column if not exists payment_method  jsonb,
  add column if not exists note            text,
  add column if not exists responded_at    timestamptz;

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders
  add constraint orders_status_check
  check (status in ('placed','confirmed','shipped','completed','cancelled','declined'));

-- responded_at flips when the provider first acts on a placed order, mirroring
-- the bookings.responded_at trigger from 0005.
create or replace function public.orders_set_responded_at()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status
     and old.status = 'placed'
     and new.status <> 'placed'
     and new.responded_at is null then
    new.responded_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists orders_set_responded_at on public.orders;
create trigger orders_set_responded_at
  before update on public.orders
  for each row execute function public.orders_set_responded_at();

-- Make sure UPDATE events flow through realtime (INSERT was added in 0004).
do $$
begin
  if exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    -- alter publication add table is idempotent for already-included tables
    -- but we wrap to keep the migration safe to re-run.
    begin
      alter publication supabase_realtime add table public.orders;
    exception when duplicate_object then null;
    end;
  end if;
end $$;

-- 0004 only let the OWNER update an order, so provider-side accept/ship/complete
-- silently bounced off RLS. Split that policy: owner can update their fields,
-- vendor can update their fields too. The participant SELECT policy from 0004
-- stays as-is (auth.uid() = owner_id or auth.uid() = vendor_id).
drop policy if exists orders_update_owner    on public.orders;
drop policy if exists orders_update_vendor   on public.orders;
drop policy if exists orders_update_participant on public.orders;
create policy orders_update_participant on public.orders
  for update
  using (auth.uid() = owner_id or auth.uid() = vendor_id)
  with check (auth.uid() = owner_id or auth.uid() = vendor_id);
