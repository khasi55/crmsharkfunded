-- Create the custom admin users table if not exists
create table if not exists public.admin_users (
  id uuid default gen_random_uuid() primary key,
  email text unique not null,
  password text not null, -- Plain text as per current request
  full_name text,
  role text default 'super_admin', -- super_admin, risk_admin, payouts_admin, sub_admin
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.admin_users enable row level security;

-- Add role column if table existed but no role
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name='admin_users' and column_name='role') then
    alter table public.admin_users add column role text default 'super_admin';
  end if;
end $$;

-- Update verify function to return role
-- Drop first because return type changed
drop function if exists public.verify_admin_credentials(text, text);

create or replace function public.verify_admin_credentials(email_input text, password_input text)
returns table (id uuid, email text, full_name text, role text)
language plpgsql
security definer
as $$
begin
  return query
  select au.id, au.email, au.full_name, au.role
  from public.admin_users au
  where au.email = email_input
  and au.password = password_input;
end;
$$;

-- Insert default admin if not exists
insert into public.admin_users (email, password, full_name, role)
values 
('admin@sharkfunded.com', 'admin123', 'Super Admin', 'super_admin')
on conflict (email) do update 
set role = 'super_admin',
    password = 'admin123'; -- Force reset password in case it was different
