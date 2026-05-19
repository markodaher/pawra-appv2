-- Pawra v2 — multi-service / multi-pet bookings + payment method
-- Run after 0001-0007. Idempotent.
--
-- Adds three nullable JSONB columns to public.bookings. Existing rows keep their
-- single `pet`/`service`/`amount` summary; new bookings additionally write the
-- full breakdown into `services`, `pets_list`, and `payment_method`.

alter table public.bookings
  add column if not exists services       jsonb,   -- BookingLineItem[]
  add column if not exists pets_list      jsonb,   -- Pet[]  (alongside the existing single `pet`)
  add column if not exists payment_method jsonb;   -- { id, label, sub, icon }
