-- ============================================
-- AI NUTRITION ANALYZER - DATABASE SETUP
-- ============================================
-- Run this entire file in your Supabase SQL Editor
-- ============================================

-- 1. CREATE PROFILES TABLE
-- ============================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  age integer,
  gender text,
  height numeric, -- in cm
  weight numeric, -- in kg
  target_weight numeric, -- in kg
  activity_level text,
  health_goals text,
  diet_preference text,
  activity_goals text,
  user_type text, -- 'diabetes', 'gym', or 'general'
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can read their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Trigger function to auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, age, gender, height, weight, activity_level, health_goals, diet_preference)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    (new.raw_user_meta_data->>'age')::integer,
    new.raw_user_meta_data->>'gender',
    (new.raw_user_meta_data->>'height')::numeric,
    (new.raw_user_meta_data->>'weight')::numeric,
    new.raw_user_meta_data->>'activity_level',
    new.raw_user_meta_data->>'health_goals',
    new.raw_user_meta_data->>'diet_preference'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. CREATE NUTRITION GOALS TABLE
-- ============================================
create table public.nutrition_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  daily_calories numeric not null,
  daily_carbs numeric not null,
  daily_fats numeric not null,
  daily_proteins numeric not null,
  calculation_date date default current_date,
  created_at timestamptz default now(),
  unique(user_id, calculation_date)
);

alter table public.nutrition_goals enable row level security;

create policy "Users can read their own nutrition goals"
  on public.nutrition_goals for select
  using (auth.uid() = user_id);

create policy "Users can insert their own nutrition goals"
  on public.nutrition_goals for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own nutrition goals"
  on public.nutrition_goals for update
  using (auth.uid() = user_id);

-- 3. CREATE FOOD ITEMS TABLE
-- ============================================
create table public.food_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  calories_per_100g numeric not null,
  carbs_per_100g numeric not null,
  fats_per_100g numeric not null,
  proteins_per_100g numeric not null,
  is_custom boolean default false,
  created_by uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now()
);

alter table public.food_items enable row level security;

create policy "Anyone can read system foods"
  on public.food_items for select
  using (is_custom = false or auth.uid() = created_by);

create policy "Users can insert their own custom foods"
  on public.food_items for insert
  with check (auth.uid() = created_by and is_custom = true);

create policy "Users can update their own custom foods"
  on public.food_items for update
  using (auth.uid() = created_by and is_custom = true);

create policy "Users can delete their own custom foods"
  on public.food_items for delete
  using (auth.uid() = created_by and is_custom = true);

-- Seed basic food items
insert into public.food_items (name, calories_per_100g, carbs_per_100g, fats_per_100g, proteins_per_100g, is_custom) values
  ('Rice (white, cooked)', 130, 28, 0.3, 2.7, false),
  ('Chicken Breast (cooked)', 165, 0, 3.6, 31, false),
  ('Broccoli (cooked)', 35, 7, 0.4, 2.4, false),
  ('Banana', 89, 23, 0.3, 1.1, false),
  ('Egg (boiled)', 155, 1.1, 11, 13, false),
  ('Oats (dry)', 389, 66, 7, 17, false),
  ('Salmon (cooked)', 206, 0, 12, 22, false),
  ('Sweet Potato (cooked)', 90, 21, 0.2, 2, false),
  ('Almonds', 579, 22, 50, 21, false),
  ('Apple', 52, 14, 0.2, 0.3, false);

-- 4. CREATE MEAL LOGS TABLE
-- ============================================
create table public.meal_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  food_name text not null,
  portion_size numeric not null,
  calories numeric not null,
  carbs numeric not null,
  fats numeric not null,
  proteins numeric not null,
  image_url text,
  logged_at timestamptz default now(),
  created_at timestamptz default now()
);

alter table public.meal_logs enable row level security;

create policy "Users can read their own meal logs"
  on public.meal_logs for select
  using (auth.uid() = user_id);

create policy "Users can insert their own meal logs"
  on public.meal_logs for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own meal logs"
  on public.meal_logs for update
  using (auth.uid() = user_id);

create policy "Users can delete their own meal logs"
  on public.meal_logs for delete
  using (auth.uid() = user_id);

create index meal_logs_user_id_logged_at_idx on public.meal_logs(user_id, logged_at desc);

-- 5. CREATE DAILY NUTRITION SUMMARY TABLE
-- ============================================
create table public.daily_nutrition_summary (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  date date not null,
  total_calories numeric default 0,
  total_carbs numeric default 0,
  total_fats numeric default 0,
  total_proteins numeric default 0,
  meals_logged integer default 0,
  updated_at timestamptz default now(),
  unique(user_id, date)
);

alter table public.daily_nutrition_summary enable row level security;

create policy "Users can read their own daily summaries"
  on public.daily_nutrition_summary for select
  using (auth.uid() = user_id);

create policy "Users can insert their own daily summaries"
  on public.daily_nutrition_summary for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own daily summaries"
  on public.daily_nutrition_summary for update
  using (auth.uid() = user_id);

-- Trigger function to update daily summary
create or replace function public.update_daily_summary()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  summary_date date;
  target_user_id uuid;
begin
  if TG_OP = 'DELETE' then
    summary_date := OLD.logged_at::date;
    target_user_id := OLD.user_id;
  else
    summary_date := NEW.logged_at::date;
    target_user_id := NEW.user_id;
  end if;

  insert into public.daily_nutrition_summary (user_id, date, total_calories, total_carbs, total_fats, total_proteins, meals_logged, updated_at)
  select 
    target_user_id,
    summary_date,
    COALESCE(sum(calories), 0),
    COALESCE(sum(carbs), 0),
    COALESCE(sum(fats), 0),
    COALESCE(sum(proteins), 0),
    count(*),
    now()
  from public.meal_logs
  where user_id = target_user_id
    and logged_at::date = summary_date
  on conflict (user_id, date)
  do update set
    total_calories = EXCLUDED.total_calories,
    total_carbs = EXCLUDED.total_carbs,
    total_fats = EXCLUDED.total_fats,
    total_proteins = EXCLUDED.total_proteins,
    meals_logged = EXCLUDED.meals_logged,
    updated_at = now();

  return COALESCE(NEW, OLD);
end;
$$;

create trigger on_meal_log_change
  after insert or update or delete on public.meal_logs
  for each row execute procedure public.update_daily_summary();

create index daily_nutrition_summary_user_id_date_idx on public.daily_nutrition_summary(user_id, date desc);

-- 6. CREATE STORAGE BUCKET
-- ============================================
insert into storage.buckets (id, name, public)
values ('meal-images', 'meal-images', true);

create policy "Users can upload their own meal images"
on storage.objects for insert
with check (
  bucket_id = 'meal-images' 
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Anyone can view meal images"
on storage.objects for select
using (bucket_id = 'meal-images');

create policy "Users can update their own meal images"
on storage.objects for update
using (
  bucket_id = 'meal-images' 
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can delete their own meal images"
on storage.objects for delete
using (
  bucket_id = 'meal-images' 
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================
-- SETUP COMPLETE!
-- ============================================
-- All tables, triggers, and policies are now created.
-- You can now proceed with the app implementation.
-- ============================================
