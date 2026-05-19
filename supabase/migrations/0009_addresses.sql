-- Pawra v2 — saved addresses (owner service-location picker)
-- Run after 0001-0008. Idempotent.

create table if not exists public.addresses (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  label       text not null default '',
  kind        text not null default 'saved'
              check (kind in ('home','work','saved','searched','recent')),
  icon        text,
  line1       text not null default '',
  area        text not null default '',
  floor       text,
  notes       text,
  coords      jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists addresses_owner_idx on public.addresses(owner_id);

alter table public.addresses enable row level security;

drop policy if exists addresses_owner on public.addresses;
create policy addresses_owner on public.addresses
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
