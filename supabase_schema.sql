-- Create a table for public profiles using the uuid from auth.users
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  full_name text,
  referral_code text unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  is_admin boolean default false,
  avatar_url text
);

-- Turn on Row Level Security
alter table public.profiles enable row level security;

-- Allow anyone to view public profiles
create policy "Public profiles are viewable by everyone." on public.profiles
  for select using (true);

-- Allow users to insert their own profile
create policy "Users can insert their own profile." on public.profiles
  for insert with check (auth.uid() = id);

-- Allow users to update their own profile
create policy "Users can update own profile." on public.profiles
  for update using (auth.uid() = id);

-- Add tracking columns to profiles
alter table public.profiles 
add column if not exists referred_by uuid references public.profiles(id),
add column if not exists total_commission numeric default 0,
add column if not exists total_referrals integer default 0,
add column if not exists phone text,
add column if not exists user_type text default 'client';

-- Staging table for user migration
create table if not exists public.userslist (
  id serial primary key,
  name text,
  email text unique not null,
  password text, -- Plain text password for migration
  phone text,
  user_type text default 'client',
  synced_at timestamp with time zone,
  auth_user_id uuid,
  migration_error text
);

-- Table for tracking individual commissions
create table if not exists public.affiliate_earnings (
  id uuid default gen_random_uuid() primary key,
  referrer_id uuid references public.profiles(id) not null,
  referred_user_id uuid references public.profiles(id) not null,
  amount numeric not null,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
declare
  referrer_id uuid;
begin
  -- Try to find referrer if code is provided
  if new.raw_user_meta_data->>'referral_code' is not null then
    select id into referrer_id from public.profiles 
    where referral_code = new.raw_user_meta_data->>'referral_code';
  end if;

  insert into public.profiles (id, full_name, referral_code, referred_by)
  values (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    substring(md5(random()::text) from 0 for 8), -- Generate a random 7-char code
    referrer_id -- Save the referrer's ID
  );
  
  -- Increment referral count for the referrer
  if referrer_id is not null then
    update public.profiles 
    set total_referrals = total_referrals + 1 
    where id = referrer_id;
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- Trigger the function every time a user is created
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
