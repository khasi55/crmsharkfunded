-- ============================================
-- RISK RULES BY MT5 GROUP
-- ============================================
-- Uses mt5_group_name as the key for rules
-- Matches actual account_types table structure

-- 0. Drop old table if exists
drop table if exists public.risk_rules_config cascade;

-- 1. Create Table (Group-Based)
create table public.risk_rules_config (
  id uuid primary key default gen_random_uuid(),
  mt5_group_name text not null unique, -- Key field
  
  -- Loss Limits
  max_daily_loss_percent numeric not null default 5.0,
  max_total_drawdown_percent numeric not null default 10.0,
  
  -- Per Trade Risk
  max_risk_per_trade_percent numeric default 2.0,
  
  -- Consistency (DISABLED)
  consistency_enabled boolean default false,
  max_single_win_percent numeric default 100.0,
  
  -- Other Rules
  max_lot_size numeric,
  trading_hours_enabled boolean default false,
  trading_start_time time,
  trading_end_time time,
  timezone text default 'UTC',
  allow_weekend_trading boolean default true,
  allow_news_trading boolean default true,
  news_buffer_minutes integer default 5,
  allow_ea_trading boolean default true,
  min_trade_duration_seconds integer default 0,
  max_trades_per_day integer,
  
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 2. Enable RLS
alter table public.risk_rules_config enable row level security;

-- 3. Create Policy
create policy "Risk rules are publicly readable"
  on public.risk_rules_config for select
  using (true);

-- 4. Insert Rules by MT5 Group
-- ONLY 3 RULES: Max Daily Loss, Max Drawdown, Max Loss Per Trade
insert into public.risk_rules_config (
    mt5_group_name,
    max_daily_loss_percent,
    max_total_drawdown_percent,
    max_risk_per_trade_percent,
    consistency_enabled
)
values 
  -- BOLT
  ('OC\contest\S\1', 4.0, 10.0, 1.0, false),
  -- LITE/REGULAR ACCOUNTS (S folders)
  ('OC\contest\S\2', 4.0, 8.0, 1.0, false),        -- Instant Funding
  ('OC\contest\S\3', 4.0, 6.0, 2.0, false),        -- 1 Step
  ('OC\contest\S\4', 4.0, 8.0, 2.0, false),        -- 2 Step
  
  -- BIN
  ('OC\contest\S\5', 4.0, 8.0, 1.0, false),

  -- PRIME/PRO ACCOUNTS (SF folders)
  ('OC\contest\S\6', 5.0, 10.0, 1.0, false),     -- Instant Funding Pro
  ('OC\contest\S\7', 5.0, 10.0, 2.0, false),     -- 1 Step Pro
  ('OC\contest\S\8', 5.0, 10.0, 2.0, false),     -- 2 Step Pro
  
  -- COMPETITION
  ('OC\contest\S\9', 5.0, 10.0, 1.0, false),

  -- FUNDED LIVE
  ('SF Funded Live', 5.0, 10.0, 1.0, false);
