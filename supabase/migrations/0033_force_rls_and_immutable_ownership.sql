-- Pawra v2 — harden RLS across all user-data tables.
--
-- Two changes:
--
-- 1. FORCE ROW LEVEL SECURITY on every user-data table.
--    `ENABLE` alone lets the table owner role (typically `postgres`/`service_role`)
--    bypass policies on direct connections. FORCE makes RLS apply even to the
--    table owner. Without this, any path that ends up running as `postgres`
--    (e.g. a poorly-scoped function, a misconfigured connection) is an
--    unguarded backdoor. (Audit T6-A.)
--
-- 2. Lock booking ownership: prevent owner_id from being changed after insert.
--    The provider_update policy already requires `auth.uid() = provider_id`,
--    but doesn't restrict which columns can change. A malicious provider with
--    an existing booking could in principle rewrite owner_id. The trigger
--    below makes owner_id immutable post-insert for every actor, including
--    service_role. (Audit T6-B: "UPDATE owner_id: NO policy — no one may
--    reassign ownership after insert.")
--
-- Run after 0001-0032. Idempotent.

-- ─── FORCE RLS on every user-data table ─────────────────────────────────
alter table public.profiles           force row level security;
alter table public.pets               force row level security;
alter table public.providers          force row level security;
alter table public.provider_services  force row level security;
alter table public.products           force row level security;
alter table public.bookings           force row level security;
alter table public.orders             force row level security;
alter table public.favorites          force row level security;
alter table public.reviews            force row level security;
alter table public.favorite_providers force row level security;
alter table public.addresses          force row level security;
alter table public.payment_methods    force row level security;
alter table public.id_verifications   force row level security;
alter table public.messages           force row level security;
alter table public.pet_health_records force row level security;
alter table public.lost_pet_alerts    force row level security;
alter table public.referral_events    force row level security;
-- paw_points_ledger was forced in 0032 already; re-issue defensively.
alter table public.paw_points_ledger  force row level security;

-- ─── Immutable booking ownership ────────────────────────────────────────
create or replace function public.bookings_lock_owner()
returns trigger
language plpgsql
as $lock_owner$
begin
  if new.owner_id is distinct from old.owner_id then
    raise exception 'bookings.owner_id is immutable';
  end if;
  return new;
end
$lock_owner$;

drop trigger if exists bookings_lock_owner on public.bookings;
create trigger bookings_lock_owner
  before update on public.bookings
  for each row execute function public.bookings_lock_owner();

-- Same lock for orders.owner_id (vendor reassignment is also blocked).
create or replace function public.orders_lock_ownership()
returns trigger
language plpgsql
as $lock_order_owner$
begin
  if new.owner_id is distinct from old.owner_id then
    raise exception 'orders.owner_id is immutable';
  end if;
  if new.vendor_id is distinct from old.vendor_id then
    raise exception 'orders.vendor_id is immutable';
  end if;
  return new;
end
$lock_order_owner$;

drop trigger if exists orders_lock_ownership on public.orders;
create trigger orders_lock_ownership
  before update on public.orders
  for each row execute function public.orders_lock_ownership();
