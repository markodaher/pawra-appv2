-- Allow the owner to delete their own bookings (used by the activity sheet's
-- "Delete this booking" action on completed/cancelled/declined bookings).
-- The provider may also delete declined bookings during the 10-minute cleanup
-- window — see AppContext bookingsRef sweep.
drop policy if exists bookings_owner_delete on public.bookings;
create policy bookings_owner_delete on public.bookings
  for delete using (auth.uid() = owner_id);

drop policy if exists bookings_provider_delete on public.bookings;
create policy bookings_provider_delete on public.bookings
  for delete using (auth.uid() = provider_id);
