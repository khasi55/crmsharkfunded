-- ============================================
-- RISK ENGINE DATABASE SCHEMA
-- ============================================
-- This migration creates all tables needed for comprehensive risk monitoring
-- including trades, violations, daily stats, and rule configuration

-- ============================================
-- TRADES TABLE
-- ============================================
-- Stores all trading activity for risk analysis
create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null,
  user_id uuid references public.profiles(id) on delete cascade,
  
  -- Trade Identification
  ticket_number text not null,
  symbol text not null,
  type text not null check (type in ('buy', 'sell')),
  
  -- Trade Details
  lots numeric not null check (lots > 0),
  open_price numeric not null,
  close_price numeric,
  open_time timestamp with time zone not null,
  close_time timestamp with time zone,
  
  -- Financial Results
  profit_loss numeric default 0,
  commission numeric default 0,
  swap numeric default 0,
  net_profit numeric generated always as (profit_loss + commission + swap) stored,
  
  -- Risk Flags
  is_news_trade boolean default false,
  is_weekend_trade boolean default false,
  is_ea_trade boolean default false,
  is_copy_trade boolean default false,
  
  -- EA Detection
  magic_number integer,
  comment text,
  
  -- Metadata
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  
  -- Constraints
  unique(challenge_id, ticket_number)
);

-- Add index for fast queries
create index if not exists idx_trades_challenge on public.trades(challenge_id);
create index if not exists idx_trades_user on public.trades(user_id);
create index if not exists idx_trades_open_time on public.trades(open_time);
create index if not exists idx_trades_symbol on public.trades(symbol);

-- ============================================
-- RISK VIOLATIONS TABLE
-- ============================================
-- Logs all risk rule violations
create table if not exists public.risk_violations (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null,
  user_id uuid references public.profiles(id) on delete cascade,
  
  -- Violation Details
  violation_type text not null,
  -- Types: 'daily_loss', 'max_drawdown', 'trading_hours', 'consistency', 
  --        'lot_size', 'news_trading', 'weekend_trading', 'ea_detected',
  --        'revenge_trading', 'tick_scalping', 'copy_trading'
  
  severity text not null check (severity in ('warning', 'critical', 'breach')),
  description text not null,
  
  -- Related Data
  trade_ticket text,
  symbol text,
  amount numeric,
  threshold numeric,
  percentage numeric,
  
  -- Additional Context
  metadata jsonb default '{}'::jsonb,
  
  -- Status
  is_resolved boolean default false,
  resolved_at timestamp with time zone,
  resolved_by uuid references public.profiles(id),
  resolution_notes text,
  
  -- Timestamps
  created_at timestamp with time zone default now(),
  
  -- Foreign Key to trades if applicable
  trade_id uuid references public.trades(id) on delete set null
);

-- Indexes for violations
create index if not exists idx_violations_challenge on public.risk_violations(challenge_id);
create index if not exists idx_violations_user on public.risk_violations(user_id);
create index if not exists idx_violations_type on public.risk_violations(violation_type);
create index if not exists idx_violations_severity on public.risk_violations(severity);
create index if not exists idx_violations_created on public.risk_violations(created_at desc);

-- ============================================
-- DAILY STATISTICS TABLE
-- ============================================
-- Tracks daily performance and risk metrics
create table if not exists public.daily_stats (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null,
  user_id uuid references public.profiles(id) on delete cascade,
  trading_date date not null default current_date,
  
  -- Starting Values (snapshot at 00:00 UTC)
  starting_balance numeric not null,
  starting_equity numeric not null,
  
  -- Daily Trade Metrics
  total_trades integer default 0,
  winning_trades integer default 0,
  losing_trades integer default 0,
  break_even_trades integer default 0,
  
  -- Financial Metrics
  daily_pnl numeric default 0,
  gross_profit numeric default 0,
  gross_loss numeric default 0,
  largest_win numeric default 0,
  largest_loss numeric default 0,
  average_win numeric default 0,
  average_loss numeric default 0,
  
  -- Risk Metrics
  max_daily_loss_limit numeric not null,
  max_drawdown_limit numeric not null,
  current_drawdown numeric default 0,
  peak_balance numeric,
  
  -- Volume Metrics
  total_lots_traded numeric default 0,
  largest_lot_size numeric default 0,
  
  -- Status Flags
  is_breached boolean default false,
  breach_reason text,
  breach_time timestamp with time zone,
  
  -- Timestamps
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  
  -- Constraints
  unique(challenge_id, trading_date)
);

-- Indexes for daily stats
create index if not exists idx_daily_stats_challenge on public.daily_stats(challenge_id);
create index if not exists idx_daily_stats_date on public.daily_stats(trading_date desc);
create index if not exists idx_daily_stats_user on public.daily_stats(user_id);

-- ============================================
-- RISK RULES CONFIGURATION TABLE
-- ============================================
-- Stores configurable thresholds for different challenge types
create table if not exists public.risk_rules_config (
  id uuid primary key default gen_random_uuid(),
  challenge_type text not null, -- 'evaluation', 'rapid', 'funded'
  account_size numeric not null,
  
  -- Loss Limits
  max_daily_loss_percent numeric not null default 5.0,
  max_total_drawdown_percent numeric not null default 10.0,
  
  -- Lot Sizing
  max_lot_size numeric,
  max_risk_per_trade_percent numeric default 2.0,
  
  -- Consistency Rules
  consistency_enabled boolean default true,
  max_single_win_percent numeric default 50.0, -- % of total profit
  
  -- Trading Hours
  trading_hours_enabled boolean default false,
  trading_start_time time,
  trading_end_time time,
  timezone text default 'UTC',
  
  -- Trading Restrictions
  allow_weekend_trading boolean default false,
  allow_news_trading boolean default true,
  news_buffer_minutes integer default 5,
  allow_ea_trading boolean default true,
  
  -- Scalping Rules
  min_trade_duration_seconds integer default 180, -- 3 minutes
  max_trades_per_day integer,
  
  -- Active Status
  is_active boolean default true,
  
  -- Timestamps
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  
  -- Constraints
  unique(challenge_type, account_size)
);

-- Insert default risk rules for common configurations
insert into public.risk_rules_config (challenge_type, account_size, max_daily_loss_percent, max_total_drawdown_percent)
values 
  ('evaluation', 10000, 5.0, 10.0),
  ('evaluation', 25000, 5.0, 10.0),
  ('evaluation', 50000, 5.0, 10.0),
  ('evaluation', 100000, 5.0, 10.0),
  ('rapid', 10000, 4.0, 8.0),
  ('rapid', 25000, 4.0, 8.0),
  ('rapid', 50000, 4.0, 8.0),
  ('funded', 10000, 5.0, 10.0),
  ('funded', 25000, 5.0, 10.0),
  ('funded', 50000, 5.0, 10.0)
on conflict (challenge_type, account_size) do nothing;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
alter table public.trades enable row level security;
alter table public.risk_violations enable row level security;
alter table public.daily_stats enable row level security;
alter table public.risk_rules_config enable row level security;

-- Trades policies
create policy "Users can view own trades"
  on public.trades for select
  using (auth.uid() = user_id);

create policy "Users can insert own trades"
  on public.trades for insert
  with check (auth.uid() = user_id);

-- Violations policies
create policy "Users can view own violations"
  on public.risk_violations for select
  using (auth.uid() = user_id);

-- Daily stats policies
create policy "Users can view own daily stats"
  on public.daily_stats for select
  using (auth.uid() = user_id);

-- Risk rules are public (read-only for users)
create policy "Risk rules are publicly readable"
  on public.risk_rules_config for select
  using (true);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to update daily stats
create or replace function public.update_daily_stats()
returns trigger as $$
begin
  -- Update daily stats when a trade is inserted or updated
  insert into public.daily_stats (
    challenge_id,
    user_id,
    trading_date,
    starting_balance,
    starting_equity,
    max_daily_loss_limit,
    max_drawdown_limit,
    total_trades,
    winning_trades,
    losing_trades,
    daily_pnl,
    largest_win,
    largest_loss,
    total_lots_traded,
    largest_lot_size
  )
  values (
    new.challenge_id,
    new.user_id,
    date(new.open_time),
    0, -- Will be set by separate process
    0, -- Will be set by separate process
    0, -- Will be fetched from config
    0, -- Will be fetched from config
    1,
    case when new.net_profit > 0 then 1 else 0 end,
    case when new.net_profit < 0 then 1 else 0 end,
    coalesce(new.net_profit, 0),
    case when new.net_profit > 0 then new.net_profit else 0 end,
    case when new.net_profit < 0 then abs(new.net_profit) else 0 end,
    new.lots,
    new.lots
  )
  on conflict (challenge_id, trading_date) do update set
    total_trades = daily_stats.total_trades + 1,
    winning_trades = daily_stats.winning_trades + case when new.net_profit > 0 then 1 else 0 end,
    losing_trades = daily_stats.losing_trades + case when new.net_profit < 0 then 1 else 0 end,
    daily_pnl = daily_stats.daily_pnl + coalesce(new.net_profit, 0),
    largest_win = greatest(daily_stats.largest_win, case when new.net_profit > 0 then new.net_profit else 0 end),
    largest_loss = greatest(daily_stats.largest_loss, case when new.net_profit < 0 then abs(new.net_profit) else 0 end),
    total_lots_traded = daily_stats.total_lots_traded + new.lots,
    largest_lot_size = greatest(daily_stats.largest_lot_size, new.lots),
    updated_at = now();
    
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to auto-update daily stats
create trigger update_daily_stats_trigger
  after insert on public.trades
  for each row execute function public.update_daily_stats();

-- Function to check if trading is allowed (helper for rules)
create or replace function public.is_weekend(check_time timestamp with time zone)
returns boolean as $$
begin
  return extract(dow from check_time) in (0, 6); -- Sunday = 0, Saturday = 6
end;
$$ language plpgsql immutable;

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================
comment on table public.trades is 'Stores all trading activity for risk analysis and monitoring';
comment on table public.risk_violations is 'Logs all detected risk rule violations with severity levels';
comment on table public.daily_stats is 'Tracks daily performance metrics and risk calculations';
comment on table public.risk_rules_config is 'Configuration for risk rules by challenge type and size';
