-- Pawra v2 — optional pet photo. Run after 0001-0015. Idempotent.
-- The avatar component falls back to the first letter of the name when null.

alter table public.pets
  add column if not exists image_url text;

-- ============================================================================
-- Storage bucket for pet photos.
-- Public read so providers can see the pet on their inbox cards without auth.
-- Writes scoped to the owner's folder via RLS, same shape as provider-photos.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('pet-photos', 'pet-photos', true)
on conflict (id) do nothing;

drop policy if exists "Pet photos public read" on storage.objects;
create policy "Pet photos public read" on storage.objects
  for select using (bucket_id = 'pet-photos');

drop policy if exists "Pet photos owner insert" on storage.objects;
create policy "Pet photos owner insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'pet-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Pet photos owner update" on storage.objects;
create policy "Pet photos owner update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'pet-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Pet photos owner delete" on storage.objects;
create policy "Pet photos owner delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'pet-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
