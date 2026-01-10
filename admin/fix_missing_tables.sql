-- ============================================
-- CONSOLIDATED SCHEMA FOR DASHBOARD APIS
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. TRADES TABLE
CREATE TABLE IF NOT EXISTS public.trades (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id uuid NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    ticket text,
    symbol text,
    type text,
    lots numeric,
    open_price numeric,
    close_price numeric,
    open_time timestamptz,
    close_time timestamptz,
    profit_loss numeric DEFAULT 0,
    commission numeric DEFAULT 0,
    swap numeric DEFAULT 0,
    comment text,
    created_at timestamptz DEFAULT now(),
    UNIQUE(challenge_id, ticket)
);

CREATE INDEX IF NOT EXISTS idx_trades_challenge_id ON public.trades(challenge_id);
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON public.trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_open_time ON public.trades(open_time);
CREATE INDEX IF NOT EXISTS idx_trades_close_time ON public.trades(close_time);

-- 2. RISK VIOLATIONS TABLE
CREATE TABLE IF NOT EXISTS public.risk_violations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id uuid NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    violation_type text NOT NULL,
    severity text NOT NULL CHECK (severity IN ('warning', 'critical', 'breach')),
    description text NOT NULL,
    trade_ticket text,
    symbol text,
    amount numeric,
    threshold numeric,
    percentage numeric,
    metadata jsonb DEFAULT '{}'::jsonb,
    is_resolved boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_violations_challenge ON public.risk_violations(challenge_id);
CREATE INDEX IF NOT EXISTS idx_violations_user ON public.risk_violations(user_id);
CREATE INDEX IF NOT EXISTS idx_violations_type ON public.risk_violations(violation_type);

-- 3. CHALLENGE RULES TABLE
CREATE TABLE IF NOT EXISTS public.challenge_rules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id uuid NOT NULL UNIQUE,
    user_id uuid REFERENCES auth.users(id),
    
    -- Loss Limits
    max_daily_loss_percent numeric DEFAULT 5.0,
    max_total_loss_percent numeric DEFAULT 10.0,
    max_daily_loss_amount numeric,
    max_total_loss_amount numeric,
    
    -- Profit Targets
    profit_target_amount numeric,
    profit_target_percent numeric,
    
    -- Trading Rules
    min_trading_days integer DEFAULT 4,
    max_lot_size numeric,
    allow_weekend_trading boolean DEFAULT false,
    allow_news_trading boolean DEFAULT true,
    
    -- Metadata
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_challenge_rules_challenge ON public.challenge_rules(challenge_id);

-- 4. DAILY ACCOUNT STATS TABLE
CREATE TABLE IF NOT EXISTS public.daily_account_stats (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id uuid NOT NULL,
    date date NOT NULL,
    balance numeric NOT NULL DEFAULT 0,
    equity numeric NOT NULL DEFAULT 0,
    daily_profit numeric NOT NULL DEFAULT 0,
    total_profit numeric NOT NULL DEFAULT 0,
    trades_count integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(challenge_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_stats_challenge_date ON public.daily_account_stats(challenge_id, date);

-- 5. TRADE CONSISTENCY SNAPSHOT TABLE (Optional - for caching)
CREATE TABLE IF NOT EXISTS public.trade_consistency_snapshot (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id uuid NOT NULL,
    user_id uuid REFERENCES auth.users(id),
    snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
    trade_percentage numeric,
    cumulative_profit numeric,
    total_winning_trades integer,
    is_violation boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    UNIQUE(challenge_id, snapshot_date)
);

-- 6. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_account_stats ENABLE ROW LEVEL SECURITY;

-- 7. CREATE RLS POLICIES
-- Trades policies
DROP POLICY IF EXISTS "Users can view own trades" ON public.trades;
CREATE POLICY "Users can view own trades"
    ON public.trades FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own trades" ON public.trades;
CREATE POLICY "Users can insert own trades"
    ON public.trades FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Risk violations policies
DROP POLICY IF EXISTS "Users can view own violations" ON public.risk_violations;
CREATE POLICY "Users can view own violations"
    ON public.risk_violations FOR SELECT
    USING (auth.uid() = user_id);

-- Challenge rules policies
DROP POLICY IF EXISTS "Users can view own rules" ON public.challenge_rules;
CREATE POLICY "Users can view own rules"
    ON public.challenge_rules FOR SELECT
    USING (auth.uid() = user_id);

-- Daily stats policies
DROP POLICY IF EXISTS "Users can view own stats" ON public.daily_account_stats;
CREATE POLICY "Users can view own stats"
    ON public.daily_account_stats FOR SELECT
    USING (challenge_id IN (
        SELECT id FROM public.challenges WHERE user_id = auth.uid()
    ));

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '✅ All dashboard tables created successfully!';
    RAISE NOTICE 'Tables: trades, risk_violations, challenge_rules, daily_account_stats';
    RAISE NOTICE 'Next step: Refresh your Supabase schema cache or restart your app';
END $$;
