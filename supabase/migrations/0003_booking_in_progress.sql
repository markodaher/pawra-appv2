-- Pawra v2 — add in_progress status to bookings
-- Run after 0001_initial_schema.sql.
-- Idempotent: drops and recreates the check constraint.

alter table public.bookings drop constraint if exists bookings_status_check;
alter table public.bookings add constraint bookings_status_check
  check (status in ('pending','confirmed','in_progress','completed','cancelled','declined'));
