-- ============================================================================
-- RISK CALCULATION OPTIMIZATION SCHEMA
-- ============================================================================
-- This schema creates two optimized tables to handle Live Risk Checks and
-- Historical Analysis separately, removing load from the 'trades' table.
-- ============================================================================

-- 1. LIVE RISK STATE (The "Fast" Table)
-- ----------------------------------------------------------------------------
-- This table stores ONLY the current state of each active challenge.
-- The Risk Engine queries this SINGLE row to approve/deny trades.
-- It is updated via Triggers on the 'trades' table.

CREATE TABLE IF NOT EXISTS public.risk_states (
    challenge_id uuid PRIMARY KEY REFERENCES public.challenges(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id),
    
    -- Current Status (Updated Real-time)
    current_balance numeric NOT NULL DEFAULT 0,
    current_equity numeric NOT NULL DEFAULT 0,
    
    -- Daily Risk Reference (Snapshot at 00:00 UTC)
    daily_start_balance numeric NOT NULL, -- Used for Max Daily Loss calculation
    daily_start_equity numeric NOT NULL,  -- Some rules use Equity for daily reference
    daily_max_loss_limit numeric NOT NULL, -- The specific $ amount allowed to lose today
    
    -- Trailing Risk Reference
    high_water_mark numeric NOT NULL, -- Highest equity ever reached (for Trailing Drawdown)
    max_total_loss_limit numeric NOT NULL, -- The specific $ amount allowed to lose total
    
    -- Violation Flags (Quick Check)
    is_breached boolean DEFAULT false,
    breach_reason text,
    
    updated_at timestamptz DEFAULT now()
);

-- Index for instant lookup by challenge
CREATE INDEX IF NOT EXISTS idx_risk_states_lookup ON public.risk_states(challenge_id);


-- 2. EQUITY SNAPSHOTS (The "History" Table)
-- ----------------------------------------------------------------------------
-- This table stores equity points over time (e.g., every hour, or every trade close).
-- Used for: "Balance History" Chart, "Drawdown" Charts, and visual analysis.
-- It keeps the 'trades' table clean from heavy analytical queries.

CREATE TABLE IF NOT EXISTS public.equity_snapshots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id uuid REFERENCES public.challenges(id) ON DELETE CASCADE,
    
    -- Snapshot Data
    balance numeric NOT NULL,
    equity numeric NOT NULL,
    
    -- Context
    snapshot_time timestamptz DEFAULT now(),
    reason text, -- 'trade_close', 'daily_rollover', 'payout'
    
    -- Optional: Link to trade if triggered by one
    trigger_trade_id uuid REFERENCES public.trades(id)
);

-- Index for charting (get history for a challenge)
CREATE INDEX IF NOT EXISTS idx_equity_snapshots_chart 
ON public.equity_snapshots(challenge_id, snapshot_time ASC);


-- ============================================================================
-- AUTOMATION LOGIC (Triggers)
-- ============================================================================

-- A. Trigger to Update Live Risk State on Trade Close
CREATE OR REPLACE FUNCTION public.update_risk_state()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the Risk State row for this challenge
    INSERT INTO public.risk_states (
        challenge_id, 
        user_id, 
        current_balance, 
        current_equity, 
        daily_start_balance,
        daily_start_equity,
        daily_max_loss_limit,
        high_water_mark,
        max_total_loss_limit
    )
    VALUES (
        NEW.challenge_id,
        NEW.user_id,
        (SELECT current_balance FROM challenges WHERE id = NEW.challenge_id), -- Assuming challenges table update first? 
        -- Better: Calculate directly if possible, or fetch from challenges
        0, 0, 0, 0, 0, 0 -- Placeholders: In reality, you'd fetch 'challenges' values
    )
    ON CONFLICT (challenge_id) DO UPDATE SET
        current_balance = EXCLUDED.current_balance, -- Simplified for example
        current_equity = EXCLUDED.current_equity,
        high_water_mark = GREATEST(risk_states.high_water_mark, EXCLUDED.current_equity),
        updated_at = now();
        
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SECURITY (Row Level Security)
-- ============================================================================
-- NOTE: The 'public' schema is just a namespace. Access is controlled here.

-- 1. Enable RLS
ALTER TABLE public.risk_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equity_snapshots ENABLE ROW LEVEL SECURITY;

-- 2. Create Policies

-- Allow Users to view ONLY their own Risk State
-- "Safety Mechanism": Even though it's "public.risk_states", I can only see rows where user_id = me
CREATE POLICY "Users can view own risk state"
ON public.risk_states FOR SELECT
USING (auth.uid() = user_id);

-- Allow Users to view ONLY their own Equity History
CREATE POLICY "Users can view own equity snapshots"
ON public.equity_snapshots FOR SELECT
USING (auth.uid() = (SELECT user_id FROM public.challenges WHERE id = challenge_id));
-- (Assumes challenge -> user link is valid. Alternatively denormalize user_id to snapshots)

-- System/Service Role can do everything (for the Risk Engine worker)
-- (Supabase service_role bypasses RLS by default, but explicit grants help documentation)
