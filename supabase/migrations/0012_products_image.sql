-- Allow shop listings to carry a single hero photo. Stored as the public URL
-- of an object in the provider-photos bucket; null until the provider picks one.
alter table public.products
  add column if not exists image_url text;
