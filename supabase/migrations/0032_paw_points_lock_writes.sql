-- Pawra v2 — lock down paw_points_ledger writes.
--
-- Before this migration, the table had a `FOR ALL` policy keyed on owner_id =
-- auth.uid(). That let any authenticated user INSERT arbitrary `earn` rows
-- into their own ledger — i.e., trivially mint themselves unlimited points.
-- (Audit finding T6-E: "Client-side INSERT policy on this table is a
-- points-farming vulnerability.")
--
-- This migration:
--   1. Drops the unsafe FOR ALL policy.
--   2. Adds a SELECT-only policy for owners (clients can read their own
--      ledger but cannot write).
--   3. Forces row-level security so even the table owner cannot bypass it
--      via direct SQL (T6-A: FORCE ROW LEVEL SECURITY).
--   4. Adds two SECURITY DEFINER RPC functions that the client calls instead.
--      Each function validates server-side (booking/order ownership, status,
--      amount, balance) so the caller cannot forge points.
--
-- Run after 0026. Idempotent.

-- ─── 1. Tighten policies ─────────────────────────────────────────────────
drop policy if exists "owners_own_points" on public.paw_points_ledger;

drop policy if exists "paw_points_select_own" on public.paw_points_ledger;
create policy "paw_points_select_own" on public.paw_points_ledger
  for select using (owner_id = auth.uid());

-- No INSERT / UPDATE / DELETE policy for clients. The two RPCs below run as
-- SECURITY DEFINER, bypassing RLS, but contain explicit ownership checks.

alter table public.paw_points_ledger force row level security;

-- ─── 2. Award (earn) — only callable for completed bookings/orders ──────
create or replace function public.award_paw_points(
  p_reference_id text,
  p_kind         text             -- 'booking' or 'order'
)
returns int
language plpgsql
security definer
set search_path = public
as $award$
declare
  v_owner uuid;
  v_amount numeric;
  v_status text;
  v_points int;
  v_existing int;
begin
  if p_kind = 'booking' then
    select owner_id, amount, status
      into v_owner, v_amount, v_status
      from public.bookings
     where id::text = p_reference_id;
  elsif p_kind = 'order' then
    select owner_id, total, status
      into v_owner, v_amount, v_status
      from public.orders
     where id::text = p_reference_id;
  else
    raise exception 'award_paw_points: invalid kind %', p_kind;
  end if;

  if v_owner is null then
    raise exception 'award_paw_points: reference % not found', p_reference_id;
  end if;
  if v_owner <> auth.uid() then
    raise exception 'award_paw_points: not your %', p_kind;
  end if;
  if v_status <> 'completed' then
    raise exception 'award_paw_points: % not completed (status=%)', p_kind, v_status;
  end if;

  -- One earn event per reference. If already awarded, no-op.
  select count(*) into v_existing
    from public.paw_points_ledger
   where owner_id = v_owner
     and type = 'earn'
     and reference_id = p_reference_id;
  if v_existing > 0 then
    return 0;
  end if;

  -- Server-side point calc: 10 pts per dollar, floor.
  v_points := greatest(0, floor(v_amount * 10)::int);
  if v_points = 0 then return 0; end if;

  insert into public.paw_points_ledger (owner_id, type, points, description, reference_id)
  values (v_owner, 'earn', v_points,
          format('Earned on %s', p_kind), p_reference_id);

  return v_points;
end
$award$;

revoke all on function public.award_paw_points(text, text) from public;
grant execute on function public.award_paw_points(text, text) to authenticated;

-- ─── 3. Redeem — validates balance server-side ───────────────────────────
create or replace function public.redeem_paw_points(
  p_reference_id text,
  p_points       int,
  p_description  text
)
returns int
language plpgsql
security definer
set search_path = public
as $redeem$
declare
  v_owner uuid := auth.uid();
  v_balance int;
begin
  if v_owner is null then
    raise exception 'redeem_paw_points: not authenticated';
  end if;
  if p_points <= 0 then
    raise exception 'redeem_paw_points: points must be positive';
  end if;

  -- Compute current balance (earn sum + redeem sum; redeem rows are negative).
  select coalesce(sum(points), 0) into v_balance
    from public.paw_points_ledger
   where owner_id = v_owner;

  if v_balance < p_points then
    raise exception 'redeem_paw_points: insufficient balance (have %, need %)', v_balance, p_points;
  end if;

  insert into public.paw_points_ledger (owner_id, type, points, description, reference_id)
  values (v_owner, 'redeem', -p_points, p_description, p_reference_id);

  return p_points;
end
$redeem$;

revoke all on function public.redeem_paw_points(text, int, text) from public;
grant execute on function public.redeem_paw_points(text, int, text) to authenticated;
