-- Pawra v2 — booking response timestamp + cleanup policy
-- Run after 0001-0004. Idempotent.

-- 1. Capture when a booking transitioned out of 'pending'.
alter table public.bookings
  add column if not exists responded_at timestamptz;

-- 2. Trigger: stamp responded_at on the first transition out of pending only.
--    Subsequent status flips (in_progress, completed) don't reset it.
create or replace function public.set_booking_responded_at()
returns trigger language plpgsql as $bookings_responded$
begin
  if old.status = 'pending' and new.status <> 'pending' and new.responded_at is null then
    new.responded_at := now();
  end if;
  return new;
end
$bookings_responded$;

drop trigger if exists set_responded_at on public.bookings;
create trigger set_responded_at
  before update on public.bookings
  for each row execute function public.set_booking_responded_at();

-- 3. Allow providers to delete their own declined bookings (used for cleanup).
drop policy if exists bookings_provider_delete_declined on public.bookings;
create policy bookings_provider_delete_declined on public.bookings
  for delete using (auth.uid() = provider_id and status = 'declined');
