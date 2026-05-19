-- Pawra v2 — orders.vendor_id + scoped policies + realtime
-- Run after 0001-0003. Idempotent.

-- 1. Add vendor_id (FK to providers).
alter table public.orders
  add column if not exists vendor_id uuid references public.providers(id) on delete set null;

create index if not exists orders_vendor_idx on public.orders(vendor_id);

-- 2. Replace the single "owner-only" policy with split policies.
drop policy if exists orders_owner               on public.orders;
drop policy if exists orders_select_participant  on public.orders;
drop policy if exists orders_insert_owner        on public.orders;
drop policy if exists orders_update_owner        on public.orders;
drop policy if exists orders_delete_owner        on public.orders;

create policy orders_select_participant on public.orders
  for select using (auth.uid() = owner_id or auth.uid() = vendor_id);

create policy orders_insert_owner on public.orders
  for insert with check (auth.uid() = owner_id);

create policy orders_update_owner on public.orders
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy orders_delete_owner on public.orders
  for delete using (auth.uid() = owner_id);

-- 3. Add to realtime publication so providers see new orders live.
do $pub$ begin
  alter publication supabase_realtime add table public.orders;
exception when duplicate_object then null; end $pub$;
