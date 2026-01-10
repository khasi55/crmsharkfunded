-- Table for User Certificates
create table if not exists public.certificates (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  
  -- Certificate Details
  title text not null,               -- e.g. "Funded Trader - Phase 1"
  description text,                  -- e.g. "Passed Phase 1 on 100k Account"
  type text default 'achievement',   -- 'achievement', 'payout', 'trophy'
  image_url text,                    -- URL to generated certificate image
  
  -- Metadata
  issued_at timestamp with time zone default timezone('utc'::text, now()) not null,
  challenge_id uuid,                 -- Optional link to specific challenge
  
  -- Status
  status text default 'issued'       -- 'issued', 'revoked'
);

-- RLS
alter table public.certificates enable row level security;

create policy "Users can view own certificates" on public.certificates 
  for select using (auth.uid() = user_id);
