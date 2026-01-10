-- Re-add columns to profiles
alter table public.profiles 
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
