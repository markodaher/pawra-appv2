-- Pawra v2 — favorited providers (shops)
-- Run after 0001-0006. Idempotent.

create table if not exists public.favorite_providers (
  owner_id    uuid not null references auth.users(id)       on delete cascade,
  provider_id uuid not null references public.providers(id) on delete cascade,
  primary key (owner_id, provider_id)
);

alter table public.favorite_providers enable row level security;

drop policy if exists fav_providers_owner on public.favorite_providers;
create policy fav_providers_owner on public.favorite_providers
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
