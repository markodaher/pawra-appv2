-- Pawra v2 — saved payment methods (owner profile + checkout sheets read this).
-- Run after 0001-0014. Idempotent.
--
-- Cash on delivery is hard-coded as a built-in option in the client (no row);
-- this table only stores user-added cards / Whish profiles. RLS scopes them
-- strictly to the owner — providers never need to read these.

create table if not exists public.payment_methods (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  kind        text not null check (kind in ('card','whish')),
  label       text not null default '',
  sub         text,
  icon        text not null default 'card',
  meta        jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists payment_methods_owner_idx on public.payment_methods(owner_id);

alter table public.payment_methods enable row level security;

drop policy if exists payment_methods_owner on public.payment_methods;
create policy payment_methods_owner on public.payment_methods
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
