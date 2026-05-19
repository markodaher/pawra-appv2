-- Soft per-side hide for bookings.
--
-- Background: a hard delete propagates to both parties via realtime, so when an
-- owner removed a completed booking from their Activity feed, the provider lost
-- it from their Schedule too. Instead, each side gets its own boolean flag and
-- "Delete this booking" simply hides the row from the actor.
--
-- The provider-side declined-cleanup sweep (10 min after decline) still hard
-- deletes via the existing bookings_provider_delete policy, which removes the
-- row for everyone — that's intentional, since both parties already abandoned it.

alter table public.bookings
  add column if not exists owner_hidden    boolean not null default false,
  add column if not exists provider_hidden boolean not null default false;

-- Owner should no longer hard-delete from the activity sheet — they hide instead.
drop policy if exists bookings_owner_delete on public.bookings;

-- Allow the owner to update only their hide flag, and the provider to update
-- only their hide flag. The provider-update policy from 0001 covers status
-- transitions; this adds the owner's narrow update path.
drop policy if exists bookings_owner_hide on public.bookings;
create policy bookings_owner_hide on public.bookings
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- RPC the client calls. Security definer so RLS doesn't block it; the body
-- itself enforces "you can only hide your own side".
create or replace function public.hide_booking_for_me(_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $hide_fn$
begin
  update public.bookings
     set owner_hidden = true
   where id = _id and owner_id = auth.uid();

  update public.bookings
     set provider_hidden = true
   where id = _id and provider_id = auth.uid();
end;
$hide_fn$;

grant execute on function public.hide_booking_for_me(uuid) to authenticated;
