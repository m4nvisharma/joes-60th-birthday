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

-- Protected removal: the password is stored as a server-side bcrypt hash.
create schema if not exists private;
create table if not exists private.campaign_secrets (
  name text primary key,
  password_hash text not null
);

revoke all on schema private from public, anon, authenticated;
revoke all on private.campaign_secrets from public, anon, authenticated;

create or replace function public.remove_donation(p_donation_id uuid, p_password text)
returns boolean
language plpgsql
security definer
set search_path = public, private, extensions
as $$
declare
  expected_hash text;
  removed_count integer;
begin
  select password_hash into expected_hash
  from private.campaign_secrets
  where name = 'remove_donation';

  if expected_hash is null or crypt(p_password, expected_hash) <> expected_hash then
    raise exception 'Invalid removal password';
  end if;

  delete from public.donations where id = p_donation_id;
  get diagnostics removed_count = row_count;
  return removed_count > 0;
end;
$$;

revoke all on function public.remove_donation(uuid, text) from public;
grant execute on function public.remove_donation(uuid, text) to anon, authenticated;
