-- Table for EVALUATION Challenges (Standard/Pro)
create table if not exists public.challenges_evaluation (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  
  -- Plan Details
  account_size numeric not null,
  plan_type text default 'standard',
  
  -- Credentials
  account_id text,          -- Login Number
  master_password text,     -- Trading Password
  investor_password text,   -- Read-only Password
  server text,              -- Broker Server
  
  -- Status & Progress
  status text default 'pending', -- 'active', 'breached', 'passed'
  is_active boolean default true,
  is_breached boolean default false,
  current_phase text default 'Phase 1',
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Table for RAPID Challenges (Fast Track)
create table if not exists public.challenges_rapid (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  
  -- Plan Details
  account_size numeric not null,
  
  -- Credentials
  account_id text,
  master_password text,
  investor_password text,
  server text,
  
  -- Status & Progress
  status text default 'pending',
  is_active boolean default true,
  is_breached boolean default false,
  current_phase text default 'Evaluation',
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table public.challenges_evaluation enable row level security;
alter table public.challenges_rapid enable row level security;

create policy "Users can view own evaluation challenges" on public.challenges_evaluation for select using (auth.uid() = user_id);
create policy "Users can view own rapid challenges" on public.challenges_rapid for select using (auth.uid() = user_id);
