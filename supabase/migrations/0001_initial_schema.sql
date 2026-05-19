-- Pawra v2 — initial schema
-- Run this once in your Supabase project's SQL editor.
-- Idempotent: safe to re-run.

-- ============================================================================
-- Tables
-- ============================================================================

create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text,
  name          text not null default '',
  dob           text not null default '',
  role          text check (role in ('owner','provider')),
  neighborhood  text not null default '',
  coords        jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.pets (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  species     text not null check (species in ('dog','cat')),
  breed       text not null default '',
  age         numeric not null default 0,
  weight      numeric not null default 0,
  sex         text not null default 'male' check (sex in ('male','female')),
  blood       text not null default '',
  color       text,
  neutered    boolean,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists pets_owner_idx on public.pets(owner_id);

create table if not exists public.providers (
  id            uuid primary key references auth.users(id) on delete cascade,
  name          text not null default '',
  type          text not null default 'walker',
  icon          text not null default 'walk',
  area          text not null default '',
  distance_km   numeric not null default 0,
  rating        numeric not null default 0,
  reviews       integer not null default 0,
  price         text not null default '$—',
  price_label   text not null default '',
  verified      boolean not null default false,
  tags          text[] not null default '{}',
  hours         text not null default '',
  staff         text not null default '',
  categories    text[] not null default '{}',
  display_pic   text,
  bio           text,
  whatsapp      text,
  gmaps_link    text,
  coords        jsonb,
  weekly_hours  jsonb,
  work_photos   text[] not null default '{}',
  emergency     boolean not null default false,
  published     boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.provider_services (
  id           uuid primary key default gen_random_uuid(),
  provider_id  uuid not null references public.providers(id) on delete cascade,
  category     text not null check (category in ('walk','groom','vet','board')),
  name         text not null,
  price        numeric not null default 0,
  unit         text not null default '',
  description  text not null default '',
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);
create index if not exists services_provider_idx on public.provider_services(provider_id);

create table if not exists public.products (
  id           uuid primary key default gen_random_uuid(),
  vendor_id    uuid not null references public.providers(id) on delete cascade,
  name         text not null,
  subtitle     text not null default '',
  price        numeric not null default 0,
  category     text not null default 'acc',
  stock_count  integer not null default 0,
  sales        integer not null default 0,
  accent       text not null default '#3E8EC9',
  distance_km  numeric not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists products_vendor_idx on public.products(vendor_id);

create table if not exists public.bookings (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references auth.users(id) on delete cascade,
  owner_name      text not null default '',
  provider_id     uuid not null references public.providers(id) on delete cascade,
  provider_name   text not null default '',
  provider_type   text not null default '',
  pet             jsonb not null,
  service         text not null default '',
  when_text       text not null default '',
  when_label      text not null default '',
  booking_time    text not null default '',
  address         text not null default '',
  distance_km     numeric not null default 0,
  amount          numeric not null default 0,
  note            text not null default '',
  share_passport  boolean not null default true,
  status          text not null default 'pending'
                  check (status in ('pending','confirmed','completed','cancelled','declined')),
  created_at      timestamptz not null default now()
);
create index if not exists bookings_owner_idx    on public.bookings(owner_id);
create index if not exists bookings_provider_idx on public.bookings(provider_id);

create table if not exists public.orders (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  vendor_name text not null default '',
  item_count  integer not null default 0,
  total       numeric not null default 0,
  when_text   text not null default 'Today',
  status      text not null default 'placed'
              check (status in ('placed','shipped','completed','cancelled')),
  created_at  timestamptz not null default now()
);
create index if not exists orders_owner_idx on public.orders(owner_id);

create table if not exists public.favorites (
  owner_id   uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  primary key (owner_id, product_id)
);

-- ============================================================================
-- updated_at trigger
-- ============================================================================

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $touch_fn$
begin
  new.updated_at := now();
  return new;
end
$touch_fn$;

drop trigger if exists touch_profiles  on public.profiles;
drop trigger if exists touch_pets      on public.pets;
drop trigger if exists touch_providers on public.providers;
drop trigger if exists touch_products  on public.products;

create trigger touch_profiles  before update on public.profiles  for each row execute function public.touch_updated_at();
create trigger touch_pets      before update on public.pets      for each row execute function public.touch_updated_at();
create trigger touch_providers before update on public.providers for each row execute function public.touch_updated_at();
create trigger touch_products  before update on public.products  for each row execute function public.touch_updated_at();

-- ============================================================================
-- Auto-create profile row when a user signs up
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $new_user_fn$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end
$new_user_fn$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- Row-level security
-- ============================================================================

alter table public.profiles          enable row level security;
alter table public.pets              enable row level security;
alter table public.providers         enable row level security;
alter table public.provider_services enable row level security;
alter table public.products          enable row level security;
alter table public.bookings          enable row level security;
alter table public.orders            enable row level security;
alter table public.favorites         enable row level security;

-- profiles: read/write own row
drop policy if exists profiles_self on public.profiles;
create policy profiles_self on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- pets: only the owner sees / writes their own pets
drop policy if exists pets_owner on public.pets;
create policy pets_owner on public.pets
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- providers: any authenticated user reads published profiles (or their own); the
-- owning user (auth.uid() = id) is the only one who can write.
drop policy if exists providers_read_published on public.providers;
create policy providers_read_published on public.providers
  for select using (auth.role() = 'authenticated' and (published = true or id = auth.uid()));
drop policy if exists providers_write_own on public.providers;
create policy providers_write_own on public.providers
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- provider_services: readable when the related provider is published or it's
-- the user's own services. Only the provider can write.
drop policy if exists services_read on public.provider_services;
create policy services_read on public.provider_services
  for select using (
    exists (
      select 1 from public.providers p
      where p.id = provider_id and (p.published = true or p.id = auth.uid())
    )
  );
drop policy if exists services_write_own on public.provider_services;
create policy services_write_own on public.provider_services
  for all using (auth.uid() = provider_id) with check (auth.uid() = provider_id);

-- products: same shape as services
drop policy if exists products_read on public.products;
create policy products_read on public.products
  for select using (
    exists (
      select 1 from public.providers p
      where p.id = vendor_id and (p.published = true or p.id = auth.uid())
    )
  );
drop policy if exists products_write_own on public.products;
create policy products_write_own on public.products
  for all using (auth.uid() = vendor_id) with check (auth.uid() = vendor_id);

-- bookings: both parties see; only the owner inserts; only the provider updates
drop policy if exists bookings_read_participants on public.bookings;
create policy bookings_read_participants on public.bookings
  for select using (auth.uid() = owner_id or auth.uid() = provider_id);
drop policy if exists bookings_owner_insert on public.bookings;
create policy bookings_owner_insert on public.bookings
  for insert with check (auth.uid() = owner_id);
drop policy if exists bookings_provider_update on public.bookings;
create policy bookings_provider_update on public.bookings
  for update using (auth.uid() = provider_id) with check (auth.uid() = provider_id);

-- orders: owner only
drop policy if exists orders_owner on public.orders;
create policy orders_owner on public.orders
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- favorites: owner only
drop policy if exists favorites_owner on public.favorites;
create policy favorites_owner on public.favorites
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- ============================================================================
-- Realtime: enable for cross-user-visible tables
-- ============================================================================

-- Postgres replication for the relevant tables — Supabase Realtime listens here.
-- Wrapped in DO blocks so re-runs don't fail when the table is already attached.
do $pub$ begin
  alter publication supabase_realtime add table public.providers;
exception when duplicate_object then null; end $pub$;

do $pub$ begin
  alter publication supabase_realtime add table public.provider_services;
exception when duplicate_object then null; end $pub$;

do $pub$ begin
  alter publication supabase_realtime add table public.products;
exception when duplicate_object then null; end $pub$;

do $pub$ begin
  alter publication supabase_realtime add table public.bookings;
exception when duplicate_object then null; end $pub$;
