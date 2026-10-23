-- TerraSuite core schema — Module 02
-- Run in Supabase SQL editor (or supabase db push via CLI).
-- Three tables + RLS own-rows policies + signup trigger.

-- ────────────────────────────────────────────────────────────────────
-- 1. profiles — one row per auth user, auto-created on signup
-- ────────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  username text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create profile on signup (security definer so the trigger can insert
-- into a table the anonymous/authenticated role otherwise cannot write).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ────────────────────────────────────────────────────────────────────
-- 2. parcels — user-drawn land regions ("fields" in the reference app)
--    Coordinates are stored as jsonb: GeoJSON Polygon outer ring,
--    i.e. [[lng,lat], ...] with the first point repeated at the end.
-- ────────────────────────────────────────────────────────────────────
create table if not exists public.parcels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id text not null,                    -- e.g. 'custom-1690000000' (map component id)
  name text not null,
  crop text not null default 'Wheat',
  crop_emoji text,
  area_ha numeric not null default 0,         -- hectares (internal unit; UI converts to acres)
  location text,
  color text,
  parcel_group text,
  ndvi_change numeric,
  coordinates jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, client_id)
);

create index if not exists parcels_user_idx on public.parcels (user_id);

-- ────────────────────────────────────────────────────────────────────
-- 3. reports — generated AI analyses & crop plans, tied to user + parcel
-- ────────────────────────────────────────────────────────────────────
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  parcel_client_id text not null,
  report_type text not null check (report_type in ('ai_analysis','crop_plan')),
  content jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists reports_user_parcel_idx
  on public.reports (user_id, parcel_client_id, created_at desc);

-- ────────────────────────────────────────────────────────────────────
-- 4. Row Level Security — THE access-control mechanism of the system.
--    An authenticated user sees and touches ONLY their own rows.
--    (The client-side route guard is UX; this is the boundary.)
-- ────────────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.parcels  enable row level security;
alter table public.reports  enable row level security;

-- profiles: read + update own
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (auth.uid() = user_id);
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- parcels: full CRUD, own rows only
create policy parcels_select_own on public.parcels
  for select to authenticated
  using (auth.uid() = user_id);
create policy parcels_insert_own on public.parcels
  for insert to authenticated
  with check (auth.uid() = user_id);
create policy parcels_update_own on public.parcels
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy parcels_delete_own on public.parcels
  for delete to authenticated
  using (auth.uid() = user_id);

-- reports: read/insert/delete own rows
create policy reports_select_own on public.reports
  for select to authenticated
  using (auth.uid() = user_id);
create policy reports_insert_own on public.reports
  for insert to authenticated
  with check (auth.uid() = user_id);
create policy reports_delete_own on public.reports
  for delete to authenticated
  using (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────────────
-- 5. updated_at maintenance
-- ────────────────────────────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists parcels_touch_updated on public.parcels;
create trigger parcels_touch_updated
  before update on public.parcels
  for each row execute function public.touch_updated_at();

drop trigger if exists profiles_touch_updated on public.profiles;
create trigger profiles_touch_updated
  before update on public.profiles
  for each row execute function public.touch_updated_at();
