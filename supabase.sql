-- Run this in the Supabase SQL editor before deploying.
create table if not exists public.donations (
  id uuid primary key default gen_random_uuid(),
  donor_name text not null check (char_length(donor_name) between 1 and 80),
  created_at timestamptz not null default now()
);

alter table public.donations enable row level security;

drop policy if exists "Anyone can read donations" on public.donations;
create policy "Anyone can read donations"
  on public.donations for select
  to anon, authenticated
  using (true);

drop policy if exists "Anyone can record a donation" on public.donations;
create policy "Anyone can record a donation"
  on public.donations for insert
  to anon, authenticated
  with check (char_length(donor_name) between 1 and 80);

-- No update/delete policies are intentionally granted.
alter publication supabase_realtime add table public.donations;
