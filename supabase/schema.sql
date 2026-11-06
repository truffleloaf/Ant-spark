-- Run once in your Supabase project's SQL Editor.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null check (char_length(trim(nickname)) between 1 and 40),
  life_stage text not null check (life_stage in ('student', 'working')),
  income integer not null,
  savings_goal integer not null check (savings_goal between 0 and 500 and savings_goal % 10 = 0),
  constraint valid_income check (
    (life_stage = 'student' and income in (1200, 1500)) or
    (life_stage = 'working' and income in (1500, 2000))
  )
);
alter table public.profiles enable row level security;
revoke all on public.profiles from anon;
grant select, insert, update on public.profiles to authenticated;
create policy "Read own profile" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "Create own profile" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "Update own profile" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
