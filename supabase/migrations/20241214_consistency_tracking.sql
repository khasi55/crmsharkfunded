-- ============================================
-- CONSISTENCY TRACKING ENHANCEMENT
-- ============================================
-- This migration adds per-trade consistency tracking
-- to enable lifetime profit analysis (not just daily)

-- ============================================
-- TRADE CONSISTENCY SNAPSHOT TABLE
-- ============================================
-- Stores cumulative profit calculations at each trade
-- This enables fast consistency checks without recalculating history
create table if not exists public.trade_consistency_snapshot (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null,
  user_id uuid references public.profiles(id) on delete cascade,
  trade_id uuid references public.trades(id) on delete cascade,
  
  -- Trade Details
  trade_ticket text not null,
  trade_profit numeric not null,
  
  -- Cumulative Metrics (at time of this trade)
  cumulative_profit numeric not null, -- Sum of all winning trades up to this point
  total_winning_trades integer not null, -- Count of winning trades up to this point
  
  -- Consistency Calculation
  trade_percentage numeric not null, -- This trade as % of cumulative profit
  is_violation boolean default false, -- True if this trade violated consistency rule
  threshold_percent numeric not null, -- The threshold used for this check
  
  -- Timestamps
  created_at timestamp with time zone default now(),
  
  -- Constraints
  unique(challenge_id, trade_ticket)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
-- Fast lookups by challenge to get latest cumulative data
create index if not exists idx_consistency_challenge 
  on public.trade_consistency_snapshot(challenge_id);

-- Fast lookups by user
create index if not exists idx_consistency_user 
  on public.trade_consistency_snapshot(user_id);

-- Fast lookups for violations
create index if not exists idx_consistency_violations 
  on public.trade_consistency_snapshot(challenge_id, is_violation) 
  where is_violation = true;

-- Time-based queries (most recent first)
create index if not exists idx_consistency_created 
  on public.trade_consistency_snapshot(challenge_id, created_at desc);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
alter table public.trade_consistency_snapshot enable row level security;

create policy "Users can view own consistency snapshots"
  on public.trade_consistency_snapshot for select
  using (auth.uid() = user_id);

create policy "System can insert consistency snapshots"
  on public.trade_consistency_snapshot for insert
  with check (true); -- Will be inserted by trigger/backend

-- ============================================
-- HELPER FUNCTION: Calculate Consistency
-- ============================================
-- This function calculates cumulative profit for a challenge
create or replace function public.get_cumulative_profit(p_challenge_id uuid)
returns table(
  cumulative_profit numeric,
  total_winning_trades bigint,
  largest_win numeric
) as $$
begin
  return query
  select 
    coalesce(sum(case when net_profit > 0 then net_profit else 0 end), 0) as cumulative_profit,
    count(*) filter (where net_profit > 0) as total_winning_trades,
    coalesce(max(case when net_profit > 0 then net_profit else 0 end), 0) as largest_win
  from public.trades
  where challenge_id = p_challenge_id
    and close_time is not null; -- Only closed trades count
end;
$$ language plpgsql security definer;

-- ============================================
-- TRIGGER: Auto-create consistency snapshot
-- ============================================
-- This trigger runs after a trade is closed/updated
-- and creates a consistency snapshot for winning trades
create or replace function public.create_consistency_snapshot()
returns trigger as $$
declare
  v_cumulative_profit numeric;
  v_total_winning_trades bigint;
  v_trade_percentage numeric;
  v_threshold_percent numeric := 50.0; -- Default 50%, can be fetched from rules
  v_is_violation boolean := false;
begin
  -- Only process closed winning trades
  if new.close_time is null or new.net_profit <= 0 then
    return new;
  end if;

  -- Get cumulative profit including this trade
  select 
    cumulative_profit,
    total_winning_trades
  into 
    v_cumulative_profit,
    v_total_winning_trades
  from public.get_cumulative_profit(new.challenge_id);

  -- Calculate percentage (avoid division by zero)
  if v_cumulative_profit > 0 then
    v_trade_percentage := (new.net_profit / v_cumulative_profit) * 100;
  else
    v_trade_percentage := 100; -- First winning trade is 100%
  end if;

  -- Check if this violates consistency (optional: fetch from risk_rules_config)
  v_is_violation := v_trade_percentage > v_threshold_percent;

  -- Insert snapshot
  insert into public.trade_consistency_snapshot (
    challenge_id,
    user_id,
    trade_id,
    trade_ticket,
    trade_profit,
    cumulative_profit,
    total_winning_trades,
    trade_percentage,
    is_violation,
    threshold_percent
  ) values (
    new.challenge_id,
    new.user_id,
    new.id,
    new.ticket_number,
    new.net_profit,
    v_cumulative_profit,
    v_total_winning_trades,
    v_trade_percentage,
    v_is_violation,
    v_threshold_percent
  )
  on conflict (challenge_id, trade_ticket) do update set
    trade_profit = excluded.trade_profit,
    cumulative_profit = excluded.cumulative_profit,
    total_winning_trades = excluded.total_winning_trades,
    trade_percentage = excluded.trade_percentage,
    is_violation = excluded.is_violation,
    threshold_percent = excluded.threshold_percent;

  return new;
end;
$$ language plpgsql security definer;

-- Create trigger for trades
drop trigger if exists create_consistency_snapshot_trigger on public.trades;
create trigger create_consistency_snapshot_trigger
  after insert or update of close_time, profit_loss, commission, swap
  on public.trades
  for each row execute function public.create_consistency_snapshot();

-- ============================================
-- MATERIALIZED VIEW: Real-time Consistency
-- ============================================
-- Provides fast access to latest consistency data per challenge
create materialized view if not exists public.mv_latest_consistency as
select distinct on (challenge_id)
  challenge_id,
  user_id,
  cumulative_profit,
  total_winning_trades,
  trade_percentage as latest_trade_percentage,
  is_violation as has_recent_violation,
  created_at as last_snapshot_at
from public.trade_consistency_snapshot
order by challenge_id, created_at desc;

-- Index on materialized view
create unique index if not exists idx_mv_latest_consistency_challenge 
  on public.mv_latest_consistency(challenge_id);

-- Refresh function (can be called periodically)
create or replace function public.refresh_consistency_view()
returns void as $$
begin
  refresh materialized view concurrently public.mv_latest_consistency;
end;
$$ language plpgsql security definer;

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================
comment on table public.trade_consistency_snapshot is 
  'Stores per-trade consistency snapshots for lifetime profit analysis';

comment on function public.get_cumulative_profit(uuid) is 
  'Calculates cumulative profit metrics for a challenge';

comment on function public.create_consistency_snapshot() is 
  'Trigger function to auto-create consistency snapshots on trade close';

comment on materialized view public.mv_latest_consistency is 
  'Fast access to latest consistency metrics per challenge';
