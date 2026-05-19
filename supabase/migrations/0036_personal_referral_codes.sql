-- Pawra v2 — every account gets a personal one-time-use referral code.
--
-- Migration 0035 introduced admin-issued promo codes. This extends that table
-- so each profile is automatically given its own code, stored in promo_codes
-- (issued_to = profile.id) AND mirrored on profiles.referral_code so the
-- ReferralSheet UI can render it without a join.
--
-- Rules (unchanged):
--   • Each code is unique, globally one-time-use.
--   • A user cannot redeem their own personal code.
--   • A user can still only redeem ONE promo code, ever.
--   • When a personal code is redeemed, BOTH parties get 500 pts ($5) —
--     matches the "Give $5. Get $5." copy in ReferralSheet.

-- ─── 1. Schema additions ────────────────────────────────────────────────
alter table public.promo_codes
  add column if not exists issued_to uuid references public.profiles(id) on delete set null;

-- One personal code per user. Admin-issued codes have issued_to = NULL and are
-- not subject to this constraint.
create unique index if not exists promo_codes_issued_to_unique
  on public.promo_codes(issued_to)
  where issued_to is not null;

-- ─── 2. Unique code generator (8-char tail) ─────────────────────────────
create or replace function public.generate_promo_code() returns text as $$
declare
  candidate text;
  collision int;
begin
  loop
    candidate := 'PAWRA-' || upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
    select count(*) into collision from public.promo_codes where code = candidate;
    exit when collision = 0;
  end loop;
  return candidate;
end;
$$ language plpgsql;

-- ─── 3. Profile triggers — generate code (BEFORE) + register it (AFTER) ─
-- Split into two triggers so the promo_codes FK to profiles.id is satisfied
-- by the time we insert into promo_codes (BEFORE INSERT row doesn't yet
-- exist as a committed profiles row).
create or replace function public.set_referral_code_default() returns trigger as $$
begin
  if new.referral_code is null then
    new.referral_code := public.generate_promo_code();
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_set_referral_code on public.profiles;
create trigger profiles_set_referral_code
  before insert on public.profiles
  for each row execute function public.set_referral_code_default();

create or replace function public.register_personal_promo_code() returns trigger as $$
begin
  -- Register this profile's referral_code in the promo_codes pool so it can
  -- be redeemed by someone else exactly once.
  insert into public.promo_codes (code, issued_to)
  values (new.referral_code, new.id)
  on conflict (code) do update
    set issued_to = coalesce(public.promo_codes.issued_to, excluded.issued_to);
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_register_promo_code on public.profiles;
create trigger profiles_register_promo_code
  after insert on public.profiles
  for each row execute function public.register_personal_promo_code();

-- ─── 4. Backfill existing profiles ──────────────────────────────────────
-- For every profile, ensure (a) it has a referral_code and (b) a matching
-- promo_codes row exists with issued_to set.
do $$
declare
  r record;
  v_code text;
begin
  for r in select id, referral_code from public.profiles loop
    if r.referral_code is null or length(r.referral_code) = 0 then
      v_code := public.generate_promo_code();
      insert into public.promo_codes (code, issued_to) values (v_code, r.id)
        on conflict (code) do nothing;
      update public.profiles set referral_code = v_code where id = r.id;
    else
      -- Make sure the existing code is registered in promo_codes.
      insert into public.promo_codes (code, issued_to)
      values (r.referral_code, r.id)
      on conflict (code) do update
        set issued_to = coalesce(public.promo_codes.issued_to, excluded.issued_to);
    end if;
  end loop;
end $$;

-- ─── 5. Update redeem RPC ───────────────────────────────────────────────
-- New behavior:
--   • Reject if the caller is the code's issuer (self-redeem).
--   • If the code has an issued_to, also credit that user (referrer bonus).
create or replace function public.redeem_promo_code(p_code text)
returns int
language plpgsql
security definer
set search_path = public
as $redeem_promo$
declare
  v_owner    uuid := auth.uid();
  v_norm     text;
  v_amount   int;
  v_active   boolean;
  v_used_by  uuid;
  v_issuer   uuid;
  v_already  int;
begin
  if v_owner is null then
    raise exception 'redeem_promo_code: not authenticated';
  end if;

  v_norm := upper(trim(p_code));
  if v_norm is null or length(v_norm) = 0 then
    raise exception 'redeem_promo_code: code required';
  end if;

  -- One promo redemption per user, ever (anti-abuse).
  select count(*) into v_already
    from public.paw_points_ledger
   where owner_id = v_owner
     and type     = 'bonus'
     and (reference_id is null or reference_id not like 'promo-ref:%');
  if v_already > 0 then
    raise exception 'redeem_promo_code: you have already redeemed a promo code';
  end if;

  -- Lock the row so two users can't race to redeem the same code.
  select amount_points, active, used_by, issued_to
    into v_amount, v_active, v_used_by, v_issuer
    from public.promo_codes
   where code = v_norm
   for update;

  if not found then
    raise exception 'redeem_promo_code: invalid code';
  end if;
  if not v_active then
    raise exception 'redeem_promo_code: this code is no longer active';
  end if;
  if v_used_by is not null then
    raise exception 'redeem_promo_code: this code has already been used';
  end if;
  if v_issuer is not null and v_issuer = v_owner then
    raise exception 'redeem_promo_code: you cannot redeem your own code';
  end if;

  -- Mark the code used.
  update public.promo_codes
     set used_by = v_owner,
         used_at = now()
   where code = v_norm;

  -- Credit the redeemer.
  insert into public.paw_points_ledger (owner_id, type, points, description, reference_id)
  values (v_owner, 'bonus', v_amount,
          format('Promo code %s', v_norm), 'promo:' || v_norm);

  -- Credit the issuer (if this is a personal code).
  -- Tagged with 'promo-ref:' so the "one promo redemption per user" check
  -- doesn't lock the issuer out of redeeming a code themselves later.
  if v_issuer is not null then
    insert into public.paw_points_ledger (owner_id, type, points, description, reference_id)
    values (v_issuer, 'bonus', v_amount,
            format('Friend redeemed your code %s', v_norm),
            'promo-ref:' || v_norm);
  end if;

  return v_amount;
end
$redeem_promo$;

revoke all on function public.redeem_promo_code(text) from public;
grant execute on function public.redeem_promo_code(text) to authenticated;
