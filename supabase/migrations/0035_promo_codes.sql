-- Pawra v2 — admin-issued promo codes (one-time-use, $5 credit).
--
-- Replaces the previous "every profile gets a vanity referral_code" assumption.
-- Vanity codes on profiles still exist (for sharing), but they grant nothing on
-- their own. Real credit only flows through codes issued in `promo_codes`.
--
-- Rules:
--   • Each code is unique, globally one-time-use.
--   • A user can only redeem one promo code, ever (anti-abuse).
--   • Redemption is atomic — locks the row, marks it used, inserts the bonus
--     ledger entry in a single transaction.
--   • Bonus is recorded as a new ledger type='bonus' so it doesn't conflict
--     with the booking/order-derived earn calculation.

-- ─── 1. Allow 'bonus' rows on the ledger ────────────────────────────────
alter table public.paw_points_ledger
  drop constraint if exists paw_points_ledger_type_check;

alter table public.paw_points_ledger
  add constraint paw_points_ledger_type_check
  check (type in ('earn', 'redeem', 'bonus'));

-- ─── 2. promo_codes table ───────────────────────────────────────────────
create table if not exists public.promo_codes (
  code          text        primary key,
  amount_points int         not null default 500,   -- 500 pts = $5
  active        boolean     not null default true,
  used_by       uuid        references public.profiles(id) on delete set null,
  used_at       timestamptz,
  note          text,
  created_at    timestamptz not null default now()
);

alter table public.promo_codes enable row level security;
alter table public.promo_codes force row level security;

-- Clients have NO direct access. All reads/writes go through the RPC below.
-- (Admin can still manage rows via the service-role key.)

create index if not exists promo_codes_used_by_idx on public.promo_codes(used_by);

-- ─── 3. Redeem RPC — atomic, one-time-use ───────────────────────────────
create or replace function public.redeem_promo_code(p_code text)
returns int
language plpgsql
security definer
set search_path = public
as $redeem_promo$
declare
  v_owner    uuid := auth.uid();
  v_code     text;
  v_amount   int;
  v_active   boolean;
  v_used_by  uuid;
  v_already  int;
begin
  if v_owner is null then
    raise exception 'redeem_promo_code: not authenticated';
  end if;

  v_code := upper(trim(p_code));
  if v_code is null or length(v_code) = 0 then
    raise exception 'redeem_promo_code: code required';
  end if;

  -- One promo code per user, ever.
  select count(*) into v_already
    from public.paw_points_ledger
   where owner_id = v_owner
     and type     = 'bonus';
  if v_already > 0 then
    raise exception 'redeem_promo_code: you have already redeemed a promo code';
  end if;

  -- Lock the row to prevent two users redeeming the same code simultaneously.
  select code, amount_points, active, used_by
    into v_code, v_amount, v_active, v_used_by
    from public.promo_codes
   where code = v_code
   for update;

  if v_code is null then
    raise exception 'redeem_promo_code: invalid code';
  end if;
  if not v_active then
    raise exception 'redeem_promo_code: this code is no longer active';
  end if;
  if v_used_by is not null then
    raise exception 'redeem_promo_code: this code has already been used';
  end if;

  -- Mark the code used.
  update public.promo_codes
     set used_by = v_owner,
         used_at = now()
   where code = v_code;

  -- Credit the user.
  insert into public.paw_points_ledger (owner_id, type, points, description, reference_id)
  values (v_owner, 'bonus', v_amount,
          format('Promo code %s', v_code), 'promo:' || v_code);

  return v_amount;
end
$redeem_promo$;

revoke all on function public.redeem_promo_code(text) from public;
grant execute on function public.redeem_promo_code(text) to authenticated;

-- ─── 4. Update redeem_paw_points balance check to include bonus rows ────
-- The client formula (lib/AppContext.tsx) is updated in the same change. Keep
-- the RPC and client in sync so a user can spend their promo bonus.
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
  v_bonus    bigint;
  v_redeemed bigint;
  v_balance  bigint;
begin
  if v_owner is null then
    raise exception 'redeem_paw_points: not authenticated';
  end if;
  if p_points <= 0 then
    raise exception 'redeem_paw_points: points must be positive';
  end if;

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

  select coalesce(sum(points)::bigint, 0)
    into v_bonus
    from public.paw_points_ledger
   where owner_id = v_owner
     and type     = 'bonus';

  select coalesce(sum(abs(points))::bigint, 0)
    into v_redeemed
    from public.paw_points_ledger
   where owner_id = v_owner
     and type     = 'redeem';

  v_balance := greatest(0, v_earned + v_bonus - v_redeemed);

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

-- ─── 5. Seed a starter batch of 20 codes ────────────────────────────────
-- Hand these out manually. Generate more with:
--   insert into promo_codes(code) values ('PAWRA-XXXX');
insert into public.promo_codes (code) values
  ('PAWRA-WELCOME01'),
  ('PAWRA-WELCOME02'),
  ('PAWRA-WELCOME03'),
  ('PAWRA-WELCOME04'),
  ('PAWRA-WELCOME05'),
  ('PAWRA-FRIEND01'),
  ('PAWRA-FRIEND02'),
  ('PAWRA-FRIEND03'),
  ('PAWRA-FRIEND04'),
  ('PAWRA-FRIEND05'),
  ('PAWRA-LAUNCH01'),
  ('PAWRA-LAUNCH02'),
  ('PAWRA-LAUNCH03'),
  ('PAWRA-LAUNCH04'),
  ('PAWRA-LAUNCH05'),
  ('PAWRA-BETA0001'),
  ('PAWRA-BETA0002'),
  ('PAWRA-BETA0003'),
  ('PAWRA-BETA0004'),
  ('PAWRA-BETA0005')
on conflict (code) do nothing;
