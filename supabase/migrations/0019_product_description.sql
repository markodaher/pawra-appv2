-- Pawra v2 — optional free-text description on products.
-- Run after 0001-0018. Idempotent.
-- Shown to owners in the product detail sheet; authored by the provider in
-- the "New listing / Edit listing" form. Nullable — existing rows are unaffected.

alter table public.products
  add column if not exists description text;
