-- Pawra v2 — fix redeem_paw_points so its balance check matches the client.
--
-- Background: the client derives "earned" points from completed bookings and
-- orders directly (10 pts per $1) and only writes REDEEM rows to the ledger.
-- The earlier redeem_paw_points RPC (migration 0032) computed balance as
-- `sum(paw_points_ledger.points)` — which only ever included redeem rows,
-- never earn rows. Result: every redeem failed with "insufficient balance"
-- and the UI rolled back the optimistic decrement, looking like points
-- weren't deducting.
--
-- This migration replaces the function with a version that calculates the
-- balance the same way the client does: completed-booking + completed-order
-- totals minus prior redemptions. Ownership and completion status are still
-- checked server-side, so the security model is preserved.

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
  v_owner    uuid := auth.uid();
  v_earned   bigint;
  v_redeemed bigint;
  v_balance  bigint;
begin
  if v_owner is null then
    raise exception 'redeem_paw_points: not authenticated';
  end if;
  if p_points <= 0 then
    raise exception 'redeem_paw_points: points must be positive';
  end if;

  -- Earned = 10 pts per $1 across this user's completed bookings + orders.
  -- Match the client formula in lib/AppContext.tsx (pawPoints useMemo) so
  -- the RPC and the UI never disagree.
  select coalesce(sum(floor(b.amount * 10))::bigint, 0)
    into v_earned
    from public.bookings b
   where b.owner_id = v_owner
     and b.status   = 'completed';

  v_earned := v_earned + coalesce((
    select sum(floor(o.total * 10))::bigint
      from public.orders o
     where o.owner_id = v_owner
       and o.status   = 'completed'
  ), 0);

  -- Redeemed = absolute value of every redeem row already in the ledger.
  select coalesce(sum(abs(points))::bigint, 0)
    into v_redeemed
    from public.paw_points_ledger
   where owner_id = v_owner
     and type     = 'redeem';

  v_balance := greatest(0, v_earned - v_redeemed);

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
