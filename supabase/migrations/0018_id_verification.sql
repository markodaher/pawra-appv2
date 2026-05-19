-- Pawra v2 — Provider ID verification.
-- Run after 0001-0017. Idempotent.
--
-- Providers scan and upload both sides of their national ID. The submission
-- lands here as 'pending'. The admin reviews in Supabase Studio and flips
-- status to 'approved' or 'rejected' (service role bypasses RLS, no extra
-- policy needed). The client subscribes via realtime so the provider sees
-- the decision without reloading.
--
-- When approved the providers.verified column is set to true via the trigger
-- below, which is what owner-side UI uses to display the verified badge.

create table if not exists public.id_verifications (
  id           uuid primary key default gen_random_uuid(),
  provider_id  uuid not null references auth.users(id) on delete cascade,
  front_url    text not null,
  back_url     text not null,
  status       text not null default 'pending'
               check (status in ('pending', 'approved', 'rejected')),
  submitted_at timestamptz not null default now(),
  reviewed_at  timestamptz,
  admin_note   text
);

-- At most one active submission per provider.
create unique index if not exists id_verifications_provider_idx
  on public.id_verifications(provider_id);

alter table public.id_verifications enable row level security;

-- Provider can read their own submission.
drop policy if exists "id_verifications_select_own" on public.id_verifications;
create policy "id_verifications_select_own" on public.id_verifications
  for select using (auth.uid() = provider_id);

-- Provider can insert a first submission.
drop policy if exists "id_verifications_insert_own" on public.id_verifications;
create policy "id_verifications_insert_own" on public.id_verifications
  for insert with check (auth.uid() = provider_id);

-- Provider can resubmit only when previously rejected.
drop policy if exists "id_verifications_update_own" on public.id_verifications;
create policy "id_verifications_update_own" on public.id_verifications
  for update
  using  (auth.uid() = provider_id and status = 'rejected')
  with check (auth.uid() = provider_id);

-- When admin flips status → 'approved', set providers.verified = true.
-- When rejected, set to false so a re-submission can flip it back.
-- Uses SECURITY DEFINER so the trigger can write to providers regardless of
-- who owns the transaction (admin uses service role which bypasses RLS anyway,
-- but the definer also lets any future webhook/function call it cleanly).
create or replace function public.id_verification_sync_verified()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    update public.providers set verified = true  where id = new.provider_id;
    new.reviewed_at := coalesce(new.reviewed_at, now());
  elsif new.status = 'rejected' and old.status is distinct from 'rejected' then
    update public.providers set verified = false where id = new.provider_id;
    new.reviewed_at := coalesce(new.reviewed_at, now());
  end if;
  return new;
end;
$$;

drop trigger if exists id_verification_sync_verified on public.id_verifications;
create trigger id_verification_sync_verified
  before update on public.id_verifications
  for each row execute function public.id_verification_sync_verified();

-- Realtime so the provider's app hears the admin decision immediately.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.id_verifications;
    exception when duplicate_object then null;
    end;
  end if;
end $$;

-- ============================================================================
-- Storage bucket for ID document photos.
-- Public read (URLs are long random paths; obscurity is sufficient for MVP).
-- Writes scoped to the provider's own folder via RLS.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('id-documents', 'id-documents', true)
on conflict (id) do nothing;

drop policy if exists "ID docs owner insert"  on storage.objects;
create policy "ID docs owner insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'id-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "ID docs owner update"  on storage.objects;
create policy "ID docs owner update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'id-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "ID docs public read"   on storage.objects;
create policy "ID docs public read" on storage.objects
  for select using (bucket_id = 'id-documents');
