-- =====================================================
-- Challenge Rules Table
-- Defines trading objectives (max daily loss, max total loss, profit target)
-- based on account type and account size
-- =====================================================

-- Create the challenge_rules table
CREATE TABLE IF NOT EXISTS challenge_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Account classification
    account_type VARCHAR(50) NOT NULL,  -- 'phase1', 'phase2', 'funded', 'instant', 'evaluation'
    account_size INTEGER NOT NULL,       -- 10000, 25000, 50000, 100000, 200000
    
    -- Loss limits (as percentage of initial balance)
    max_daily_loss_percent DECIMAL(5,2) NOT NULL DEFAULT 5.00,      -- e.g., 5.00 = 5%
    max_total_loss_percent DECIMAL(5,2) NOT NULL DEFAULT 10.00,     -- e.g., 10.00 = 10%
    
    -- Profit target (as percentage of initial balance)
    profit_target_percent DECIMAL(5,2) NOT NULL DEFAULT 8.00,       -- e.g., 8.00 = 8%
    
    -- Trading rules
    min_trading_days INTEGER DEFAULT 0,                             -- Minimum trading days required
    max_trading_days INTEGER DEFAULT NULL,                          -- Maximum days allowed (NULL = unlimited)
    
    -- Consistency rules
    consistency_rule_enabled BOOLEAN DEFAULT true,
    max_single_win_percent DECIMAL(5,2) DEFAULT 30.00,              -- Max single trade as % of total profit
    
    -- Additional flags
    allow_weekend_trading BOOLEAN DEFAULT false,
    allow_news_trading BOOLEAN DEFAULT true,
    allow_ea_trading BOOLEAN DEFAULT true,
    
    -- Metadata
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint: one rule per account type + size combination
    UNIQUE(account_type, account_size)
);

-- Create index for faster lookups
CREATE INDEX idx_challenge_rules_type_size ON challenge_rules(account_type, account_size);

-- =====================================================
-- Insert default rules for all account types and sizes
-- =====================================================

-- Phase 1 Rules (Evaluation Phase 1)
INSERT INTO challenge_rules (account_type, account_size, max_daily_loss_percent, max_total_loss_percent, profit_target_percent, min_trading_days) VALUES
('phase1', 10000, 5.00, 10.00, 8.00, 0),
('phase1', 25000, 5.00, 10.00, 8.00, 0),
('phase1', 50000, 5.00, 10.00, 8.00, 0),
('phase1', 100000, 5.00, 10.00, 8.00, 0),
('phase1', 200000, 5.00, 10.00, 8.00, 0);

-- Phase 2 Rules (Evaluation Phase 2 - lower profit target)
INSERT INTO challenge_rules (account_type, account_size, max_daily_loss_percent, max_total_loss_percent, profit_target_percent, min_trading_days) VALUES
('phase2', 10000, 5.00, 10.00, 5.00, 0),
('phase2', 25000, 5.00, 10.00, 5.00, 0),
('phase2', 50000, 5.00, 10.00, 5.00, 0),
('phase2', 100000, 5.00, 10.00, 5.00, 0),
('phase2', 200000, 5.00, 10.00, 5.00, 0);

-- Funded Account Rules (No profit target, just maintain limits)
INSERT INTO challenge_rules (account_type, account_size, max_daily_loss_percent, max_total_loss_percent, profit_target_percent, min_trading_days) VALUES
('funded', 10000, 5.00, 10.00, 0.00, 0),
('funded', 25000, 5.00, 10.00, 0.00, 0),
('funded', 50000, 5.00, 10.00, 0.00, 0),
('funded', 100000, 5.00, 10.00, 0.00, 0),
('funded', 200000, 5.00, 10.00, 0.00, 0);

-- Instant Funding Rules (Higher profit target, stricter rules)
INSERT INTO challenge_rules (account_type, account_size, max_daily_loss_percent, max_total_loss_percent, profit_target_percent, min_trading_days) VALUES
('instant', 10000, 4.00, 8.00, 10.00, 5),
('instant', 25000, 4.00, 8.00, 10.00, 5),
('instant', 50000, 4.00, 8.00, 10.00, 5),
('instant', 100000, 4.00, 8.00, 10.00, 5),
('instant', 200000, 4.00, 8.00, 10.00, 5);

-- Evaluation (One-Step) Rules
INSERT INTO challenge_rules (account_type, account_size, max_daily_loss_percent, max_total_loss_percent, profit_target_percent, min_trading_days) VALUES
('evaluation', 10000, 5.00, 10.00, 10.00, 0),
('evaluation', 25000, 5.00, 10.00, 10.00, 0),
('evaluation', 50000, 5.00, 10.00, 10.00, 0),
('evaluation', 100000, 5.00, 10.00, 10.00, 0),
('evaluation', 200000, 5.00, 10.00, 10.00, 0);

-- =====================================================
-- Row Level Security (optional - enable if needed)
-- =====================================================

-- Enable RLS
ALTER TABLE challenge_rules ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read rules (they're public config)
CREATE POLICY "Allow public read access" ON challenge_rules
    FOR SELECT
    USING (true);

-- Only admins can modify rules
CREATE POLICY "Allow admin write access" ON challenge_rules
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- =====================================================
-- Helper function to get rules for an account
-- =====================================================

CREATE OR REPLACE FUNCTION get_challenge_rules(
    p_account_type VARCHAR,
    p_account_size INTEGER
)
RETURNS TABLE (
    max_daily_loss_percent DECIMAL,
    max_total_loss_percent DECIMAL,
    profit_target_percent DECIMAL,
    min_trading_days INTEGER,
    max_trading_days INTEGER,
    consistency_rule_enabled BOOLEAN,
    max_single_win_percent DECIMAL,
    max_daily_loss_amount DECIMAL,
    max_total_loss_amount DECIMAL,
    profit_target_amount DECIMAL
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cr.max_daily_loss_percent,
        cr.max_total_loss_percent,
        cr.profit_target_percent,
        cr.min_trading_days,
        cr.max_trading_days,
        cr.consistency_rule_enabled,
        cr.max_single_win_percent,
        (cr.max_daily_loss_percent / 100.0 * p_account_size)::DECIMAL AS max_daily_loss_amount,
        (cr.max_total_loss_percent / 100.0 * p_account_size)::DECIMAL AS max_total_loss_amount,
        (cr.profit_target_percent / 100.0 * p_account_size)::DECIMAL AS profit_target_amount
    FROM challenge_rules cr
    WHERE cr.account_type = LOWER(p_account_type)
    AND cr.account_size = p_account_size
    AND cr.is_active = true
    LIMIT 1;
END;
$$;

-- =====================================================
-- Trigger to update the updated_at timestamp
-- =====================================================

CREATE OR REPLACE FUNCTION update_challenge_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_challenge_rules_updated_at
    BEFORE UPDATE ON challenge_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_challenge_rules_updated_at();
