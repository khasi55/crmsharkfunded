-- Affiliate Withdrawals Table
create table if not exists public.affiliate_withdrawals (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.profiles(id) not null,
    amount numeric not null,
    status text not null default 'pending', -- pending, approved, rejected, processed
    payout_method text not null, -- crypto, bank_transfer, paypal
    payout_details jsonb,
    created_at timestamptz default now(),
    processed_at timestamptz,
    rejection_reason text
);

-- Enable RLS
alter table public.affiliate_withdrawals enable row level security;

-- Policies
create policy "Users can view own withdrawals"
    on public.affiliate_withdrawals for select
    using (auth.uid() = user_id);

create policy "Users can create withdrawals"
    on public.affiliate_withdrawals for insert
    with check (auth.uid() = user_id);

-- Add index
create index if not exists idx_affiliate_withdrawals_user_id on public.affiliate_withdrawals(user_id);
create index if not exists idx_affiliate_withdrawals_status on public.affiliate_withdrawals(status);
