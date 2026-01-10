-- ============================================================================
-- SEPARATE RISK TABLES MIGRATION
-- ============================================================================

-- 1. CORE RISK VIOLATIONS (Hard Breaches)
-- ----------------------------------------------------------------------------
-- Stores auto-fail events: Daily Loss, Max Drawdown, Hard Risk Limits
CREATE TABLE IF NOT EXISTS public.core_risk_violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  
  violation_type text NOT NULL, 
  -- 'daily_loss', 'max_drawdown', 'max_risk_per_trade', 'profit_target_reached'
  
  severity text NOT NULL CHECK (severity IN ('breach')), -- Core is always a breach
  description text,
  
  -- Financial Data
  amount numeric,       -- The loss amount
  threshold numeric,    -- The limit that was crossed
  percentage numeric,   -- The % loss
  
  trade_ticket text,    -- If triggered by a specific trade
  
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_core_risk_challenge ON public.core_risk_violations(challenge_id);
CREATE INDEX IF NOT EXISTS idx_core_risk_user ON public.core_risk_violations(user_id);


-- 2. ADVANCED RISK FLAGS (Behavioral/Review)
-- ----------------------------------------------------------------------------
-- Stores warning flags: Martingale, Hedging, Arbitrage, Scalping
CREATE TABLE IF NOT EXISTS public.advanced_risk_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  
  flag_type text NOT NULL,
  -- 'martingale', 'hedging', 'arbitrage', 'latency_hft', 'tick_scalping', 'news_trading'
  
  severity text NOT NULL CHECK (severity IN ('warning', 'breach')),
  description text,
  
  -- Context Data
  trade_ticket text,
  symbol text,
  
  analysis_data jsonb DEFAULT '{}'::jsonb, -- Store evidence (e.g. "3 trades in 1s")
  
  -- Review Status
  is_reviewed boolean DEFAULT false,
  reviewed_by uuid,
  review_notes text,
  
  created_at timestamptz DEFAULT now()
);

-- Index for admin dashboard
CREATE INDEX IF NOT EXISTS idx_adv_risk_challenge ON public.advanced_risk_flags(challenge_id);
CREATE INDEX IF NOT EXISTS idx_adv_risk_type ON public.advanced_risk_flags(flag_type);
CREATE INDEX IF NOT EXISTS idx_adv_risk_reviewed ON public.advanced_risk_flags(is_reviewed);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE public.core_risk_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advanced_risk_flags ENABLE ROW LEVEL SECURITY;

-- Users can view their own violations
CREATE POLICY "Users view own core violations" 
ON public.core_risk_violations FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users view own advanced flags" 
ON public.advanced_risk_flags FOR SELECT USING (auth.uid() = user_id);

-- System can insert (Assuming service role usage for Risk Engine)
-- Explicit insert policies for authenticated users if logical (e.g. if engine runs as user)
CREATE POLICY "Users/System insert core violations" 
ON public.core_risk_violations FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users/System insert advanced flags" 
ON public.advanced_risk_flags FOR INSERT WITH CHECK (auth.uid() = user_id);
