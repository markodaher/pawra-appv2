-- Pawra v2 — reviews on completed bookings
-- Run after 0001-0005. Idempotent.

-- ============================================================================
-- 1. Reviews table
-- ============================================================================

create table if not exists public.reviews (
  id           uuid primary key default gen_random_uuid(),
  provider_id  uuid not null references public.providers(id) on delete cascade,
  booking_id   uuid not null references public.bookings(id)  on delete cascade,
  author_id    uuid not null references auth.users(id)       on delete cascade,
  author_name  text not null default '',
  rating       integer not null check (rating between 1 and 5),
  body         text not null default '',
  photo_url    text,
  created_at   timestamptz not null default now(),
  unique(booking_id)  -- one review per booking
);

create index if not exists reviews_provider_idx on public.reviews(provider_id);
create index if not exists reviews_author_idx   on public.reviews(author_id);

alter table public.reviews enable row level security;

-- Anyone authenticated can read.
drop policy if exists reviews_read on public.reviews;
create policy reviews_read on public.reviews
  for select using (auth.role() = 'authenticated');

-- Insert: only the booking owner, only for their own completed booking.
drop policy if exists reviews_insert_owner on public.reviews;
create policy reviews_insert_owner on public.reviews
  for insert with check (
    auth.uid() = author_id
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and b.owner_id = auth.uid()
        and b.status = 'completed'
    )
  );

-- Authors can edit / delete their own reviews.
drop policy if exists reviews_update_own on public.reviews;
create policy reviews_update_own on public.reviews
  for update using (auth.uid() = author_id) with check (auth.uid() = author_id);

drop policy if exists reviews_delete_own on public.reviews;
create policy reviews_delete_own on public.reviews
  for delete using (auth.uid() = author_id);

-- ============================================================================
-- 2. Trigger: keep providers.rating + providers.reviews in sync
-- ============================================================================

create or replace function public.recalc_provider_rating()
returns trigger
language plpgsql
security definer  -- bypass providers RLS — we only update rating/reviews counts
as $recalc_rating$
declare
  pid uuid;
begin
  pid := coalesce(new.provider_id, old.provider_id);
  update public.providers
  set rating  = coalesce((select round(avg(rating)::numeric, 2) from public.reviews where provider_id = pid), 0),
      reviews = coalesce((select count(*)              from public.reviews where provider_id = pid), 0)
  where id = pid;
  return coalesce(new, old);
end
$recalc_rating$;

drop trigger if exists reviews_recalc on public.reviews;
create trigger reviews_recalc
  after insert or update or delete on public.reviews
  for each row execute function public.recalc_provider_rating();

-- ============================================================================
-- 3. Realtime publication
-- ============================================================================

do $pub$ begin
  alter publication supabase_realtime add table public.reviews;
exception when duplicate_object then null; end $pub$;

-- ============================================================================
-- 4. Storage bucket for review photos
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('review-photos', 'review-photos', true)
on conflict (id) do nothing;

drop policy if exists "Review photos public read" on storage.objects;
create policy "Review photos public read" on storage.objects
  for select using (bucket_id = 'review-photos');

drop policy if exists "Review photos owner insert" on storage.objects;
create policy "Review photos owner insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'review-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Review photos owner update" on storage.objects;
create policy "Review photos owner update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'review-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Review photos owner delete" on storage.objects;
create policy "Review photos owner delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'review-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
