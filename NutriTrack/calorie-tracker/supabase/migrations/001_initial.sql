-- nutriTrack — initial schema
-- Run this in Supabase SQL Editor (Dashboard → SQL → New query → paste → Run).

-- ============================================================================
-- Tables
-- ============================================================================

-- Per-user daily goals.
create table if not exists public.user_settings (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  calorie_goal  int  not null default 2200 check (calorie_goal > 0),
  protein_goal  int  not null default 120  check (protein_goal >= 0),
  fat_goal      int  not null default 70   check (fat_goal >= 0),
  updated_at    timestamptz not null default now()
);

-- User's food catalog (custom entries and Open Food Facts cache).
create table if not exists public.foods (
  id                 uuid primary key default gen_random_uuid(),
  created_by         uuid not null references auth.users(id) on delete cascade,
  name               text not null,
  brand              text,
  barcode            text,
  calories_per_100g  numeric not null check (calories_per_100g >= 0),
  protein_per_100g   numeric not null default 0 check (protein_per_100g  >= 0),
  fat_per_100g       numeric not null default 0 check (fat_per_100g      >= 0),
  carbs_per_100g     numeric not null default 0 check (carbs_per_100g    >= 0),
  source             text not null default 'custom' check (source in ('custom','off')),
  created_at         timestamptz not null default now()
);

-- What the user logged on a given day.
create table if not exists public.meal_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  entry_date  date not null,
  meal_type   text not null check (meal_type in ('breakfast','lunch','dinner','snack')),
  food_id     uuid not null references public.foods(id) on delete restrict,
  grams       numeric not null check (grams > 0),
  created_at  timestamptz not null default now()
);

-- ============================================================================
-- Indexes
-- ============================================================================

create index if not exists foods_created_by_idx
  on public.foods (created_by);
create index if not exists foods_barcode_idx
  on public.foods (created_by, barcode) where barcode is not null;
create index if not exists meal_entries_user_date_idx
  on public.meal_entries (user_id, entry_date);

-- ============================================================================
-- Auto-create user_settings row on signup
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.user_settings (user_id) values (new.id)
    on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.user_settings enable row level security;
alter table public.foods           enable row level security;
alter table public.meal_entries  enable row level security;

-- user_settings: self only
drop policy if exists "user_settings self read"   on public.user_settings;
drop policy if exists "user_settings self insert" on public.user_settings;
drop policy if exists "user_settings self update" on public.user_settings;

create policy "user_settings self read"   on public.user_settings
  for select using (auth.uid() = user_id);
create policy "user_settings self insert" on public.user_settings
  for insert with check (auth.uid() = user_id);
create policy "user_settings self update" on public.user_settings
  for update using (auth.uid() = user_id);

-- foods: self only
drop policy if exists "foods self read"   on public.foods;
drop policy if exists "foods self insert" on public.foods;
drop policy if exists "foods self update" on public.foods;
drop policy if exists "foods self delete" on public.foods;

create policy "foods self read"   on public.foods
  for select using (auth.uid() = created_by);
create policy "foods self insert" on public.foods
  for insert with check (auth.uid() = created_by);
create policy "foods self update" on public.foods
  for update using (auth.uid() = created_by);
create policy "foods self delete" on public.foods
  for delete using (auth.uid() = created_by);

-- meal_entries: self only
drop policy if exists "meal_entries self read"   on public.meal_entries;
drop policy if exists "meal_entries self insert" on public.meal_entries;
drop policy if exists "meal_entries self update" on public.meal_entries;
drop policy if exists "meal_entries self delete" on public.meal_entries;

create policy "meal_entries self read"   on public.meal_entries
  for select using (auth.uid() = user_id);
create policy "meal_entries self insert" on public.meal_entries
  for insert with check (auth.uid() = user_id);
create policy "meal_entries self update" on public.meal_entries
  for update using (auth.uid() = user_id);
create policy "meal_entries self delete" on public.meal_entries
  for delete using (auth.uid() = user_id);
