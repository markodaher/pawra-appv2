-- Pawra v2 — decline / cancel reason text for bookings and orders.
-- Run after 0001-0016. Idempotent.
-- Providers can optionally include a message when they reject / cancel;
-- owners see it in their activity / order detail screens.

alter table public.bookings
  add column if not exists decline_reason text;

alter table public.orders
  add column if not exists decline_reason text;
