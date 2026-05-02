-- Create the custom admin users table
create table if not exists public.admin_users (
  id uuid default gen_random_uuid() primary key,
  email text unique not null,
  password text not null, -- Stores the password (hashed ideally, or plain as per request if insisted)
  full_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.admin_users enable row level security;

-- Only allow reading by the server (service role) or potentially self in future
-- For now, we'll keep it strictly server-side accessible for auth checks

-- Insert a default admin user (You should change the password immediately after first login if this was a real prod system)
-- For this request, we are inserting a test admin.
insert into public.admin_users (email, password, full_name)
values 
('admin@sharkfunded.com', 'admin123', 'Super Admin')
on conflict (email) do nothing;

-- Function to securely verify admin credentials (bypasses RLS)
create or replace function public.verify_admin_credentials(email_input text, password_input text)
returns table (id uuid, email text, full_name text)
language plpgsql
security definer
as $$
begin
  return query
  select au.id, au.email, au.full_name
  from public.admin_users au
  where au.email = email_input
  and au.password = password_input;
end;
$$;
