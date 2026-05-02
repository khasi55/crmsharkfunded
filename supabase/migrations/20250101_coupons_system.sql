-- ============================================
-- COUPONS SYSTEM
-- ============================================

-- 1. Coupons Table
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type text not null check (discount_type in ('percentage', 'fixed')),
  discount_value numeric not null check (discount_value > 0),
  
  -- Usage limits
  max_uses integer, -- null = unlimited
  used_count integer default 0,
  
  -- Validity
  valid_from timestamp with time zone default now(),
  valid_until timestamp with time zone,
  is_active boolean default true,
  
  -- Restrictions
  min_purchase_amount numeric default 0,
  applicable_to jsonb default '["all"]'::jsonb, -- Array of account_type_ids or ["all"]
  
  -- Metadata
  description text,
  created_by uuid references auth.users(id),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 2. Coupon Usage Tracking
create table if not exists public.coupon_usage (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id text not null,
  
  discount_applied numeric not null,
  original_amount numeric not null,
  final_amount numeric not null,
  
  created_at timestamp with time zone default now(),
  
  unique(coupon_id, order_id) -- Prevent duplicate usage on same order
);

-- Indexes
create index idx_coupons_code on public.coupons(code);
create index idx_coupons_active on public.coupons(is_active, valid_until);
create index idx_coupon_usage_user on public.coupon_usage(user_id);
create index idx_coupon_usage_coupon on public.coupon_usage(coupon_id);

-- RLS Policies
alter table public.coupons enable row level security;
alter table public.coupon_usage enable row level security;

-- Coupons are publicly readable (to validate codes)
create policy "Coupons are publicly readable"
  on public.coupons for select
  using (true);

-- Users can view their own coupon usage
create policy "Users can view own coupon usage"
  on public.coupon_usage for select
  using (auth.uid() = user_id);

-- Function to increment coupon usage
create or replace function increment_coupon_usage()
returns trigger as $$
begin
  update public.coupons
  set used_count = used_count + 1
  where id = new.coupon_id;
  return new;
end;
$$ language plpgsql security definer;

create trigger increment_coupon_usage_trigger
  after insert on public.coupon_usage
  for each row execute function increment_coupon_usage();

-- Sample coupons for testing
insert into public.coupons (code, discount_type, discount_value, max_uses, valid_until, description)
values
  ('WELCOME10', 'percentage', 10, null, now() + interval '1 year', '10% off for new users'),
  ('NEWYEAR25', 'percentage', 25, 100, '2025-01-31 23:59:59'::timestamp, '25% off New Year special'),
  ('SAVE50', 'fixed', 50, 50, now() + interval '3 months', '$50 flat discount')
on conflict (code) do nothing;
