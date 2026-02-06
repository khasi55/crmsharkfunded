-- Create advanced_risk_flags table for behavioral risk violations
CREATE TABLE IF NOT EXISTS advanced_risk_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    flag_type TEXT NOT NULL, -- 'martingale', 'hedging', 'tick_scalping', etc.
    severity TEXT NOT NULL DEFAULT 'warning', -- 'warning' or 'breach'
    description TEXT,
    trade_ticket TEXT,
    symbol TEXT,
    analysis_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_advanced_risk_flags_challenge ON advanced_risk_flags(challenge_id);
CREATE INDEX IF NOT EXISTS idx_advanced_risk_flags_user ON advanced_risk_flags(user_id);
CREATE INDEX IF NOT EXISTS idx_advanced_risk_flags_type ON advanced_risk_flags(flag_type);
CREATE INDEX IF NOT EXISTS idx_advanced_risk_flags_severity ON advanced_risk_flags(severity);
CREATE INDEX IF NOT EXISTS idx_advanced_risk_flags_created ON advanced_risk_flags(created_at DESC);

-- Enable RLS
ALTER TABLE advanced_risk_flags ENABLE ROW LEVEL SECURITY;

-- Policy for admins to view all
CREATE POLICY "Admins can view all risk flags"
    ON advanced_risk_flags FOR SELECT
    USING (true);

-- Policy for users to view their own
CREATE POLICY "Users can view own risk flags"
    ON advanced_risk_flags FOR SELECT
    USING (auth.uid() = user_id);

COMMENT ON TABLE advanced_risk_flags IS 'Behavioral risk violations (martingale, hedging, tick scalping, etc.)';
