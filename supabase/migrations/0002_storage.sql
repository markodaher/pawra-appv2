-- Pawra v2 — provider photo storage
-- Run after 0001_initial_schema.sql in the Supabase SQL editor.
-- Idempotent: safe to re-run.

-- Public bucket for provider display pictures + work photos.
-- Public = the HTTP layer serves these without auth, so any owner can render them.
insert into storage.buckets (id, name, public)
values ('provider-photos', 'provider-photos', true)
on conflict (id) do nothing;

-- Anyone can read (public bucket).
drop policy if exists "Provider photos public read" on storage.objects;
create policy "Provider photos public read" on storage.objects
  for select using (bucket_id = 'provider-photos');

-- Authenticated users can write only to their own folder (uid as first path segment).
drop policy if exists "Provider photos owner insert" on storage.objects;
create policy "Provider photos owner insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'provider-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Provider photos owner update" on storage.objects;
create policy "Provider photos owner update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'provider-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Provider photos owner delete" on storage.objects;
create policy "Provider photos owner delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'provider-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
