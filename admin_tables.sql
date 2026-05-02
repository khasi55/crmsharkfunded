-- ENUMs for status
create type request_status as enum ('pending', 'approved', 'rejected');

-- KYC Requests Table
create table if not exists public.kyc_requests (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  
  -- Documents
  front_image_url text not null,
  back_image_url text not null,
  selfie_image_url text not null,
  
  -- Details
  document_type text not null, -- 'passport', 'id_card', 'license'
  document_number text,
  
  -- Status
  status request_status default 'pending',
  rejection_reason text,
  
  -- Timestamps
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Payout Requests Table
create table if not exists public.payout_requests (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  
  -- Payment Details
  amount numeric not null,
  currency text default 'USD',
  payment_method text not null, -- 'crypto', 'bank_transfer'
  wallet_address text,
  bank_details jsonb, -- Store flexible bank info
  
  -- Status
  status request_status default 'pending',
  transaction_id text, -- For approved payouts
  rejection_reason text,
  
  -- Timestamps
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  processed_at timestamp with time zone
);

-- RLS Policies
alter table public.kyc_requests enable row level security;
alter table public.payout_requests enable row level security;

-- Admins can view all, Users can view their own
create policy "Admins can view all KYC requests" on public.kyc_requests
  for select using (auth.uid() in (select id from public.profiles where is_admin = true));

create policy "Users can view own KYC requests" on public.kyc_requests
  for select using (auth.uid() = user_id);

create policy "Users can create own KYC requests" on public.kyc_requests
  for insert with check (auth.uid() = user_id);
  
create policy "Admins can update KYC requests" on public.kyc_requests
  for update using (auth.uid() in (select id from public.profiles where is_admin = true));

-- Same for Payouts
create policy "Admins can view all payout requests" on public.payout_requests
  for select using (auth.uid() in (select id from public.profiles where is_admin = true));

create policy "Users can view own payout requests" on public.payout_requests
  for select using (auth.uid() = user_id);

create policy "Users can create own payout requests" on public.payout_requests
  for insert with check (auth.uid() = user_id);

create policy "Admins can update payout requests" on public.payout_requests
  for update using (auth.uid() in (select id from public.profiles where is_admin = true));
