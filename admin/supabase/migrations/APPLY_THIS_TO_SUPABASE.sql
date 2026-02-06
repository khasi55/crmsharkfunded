-- ============================================
-- COMBINED MIGRATION SCRIPT FOR SUPABASE
-- Run this directly in Supabase SQL Editor
-- ============================================

-- STEP 1: Update challenge_type constraint to allow new values
-- ============================================
ALTER TABLE challenges DROP CONSTRAINT IF EXISTS valid_challenge_type;

ALTER TABLE challenges ADD CONSTRAINT valid_challenge_type 
CHECK (challenge_type IN (
    -- Old values (keep for compatibility)
    'Instant', 'Evaluation', 'Phase 1', 'Phase 2', 'Funded',
    'instant', 'evaluation', 'phase_1', 'phase_2', 'funded',
    -- New Lite values
    'lite_instant', 'lite_1_step', 'lite_2_step_phase_1', 'lite_2_step_phase_2', 'lite_funded',
    -- New Prime values
    'prime_instant', 'prime_1_step', 'prime_2_step_phase_1', 'prime_2_step_phase_2', 'prime_funded',
    -- Other
    'Competition', 'competition', 'unknown'
));

-- STEP 2: Create challenge_type_rules table
-- ============================================
CREATE TABLE IF NOT EXISTS challenge_type_rules (
    challenge_type TEXT PRIMARY KEY,
    profit_target_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
    daily_drawdown_percent DECIMAL(5,2) NOT NULL,
    max_drawdown_percent DECIMAL(5,2) NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- STEP 3: Insert default risk rules values
-- ============================================
INSERT INTO challenge_type_rules (challenge_type, profit_target_percent, daily_drawdown_percent, max_drawdown_percent, description) VALUES
-- Lite accounts
('lite_instant', 0, 3, 6, 'Lite Instant Funding'),
('lite_1_step', 9, 3, 6, 'Lite 1-Step Challenge'),
('lite_2_step_phase_1', 9, 3, 6, 'Lite 2-Step Phase 1'),
('lite_2_step_phase_2', 6, 3, 6, 'Lite 2-Step Phase 2'),
('lite_funded', 0, 3, 6, 'Lite Funded Account'),
-- Prime accounts
('prime_instant', 0, 4, 7, 'Prime Instant Funding'),
('prime_1_step', 9, 4, 10, 'Prime 1-Step Challenge'),
('prime_2_step_phase_1', 9, 4, 10, 'Prime 2-Step Phase 1'),
('prime_2_step_phase_2', 6, 4, 10, 'Prime 2-Step Phase 2'),
('prime_funded', 0, 4, 7, 'Prime Funded Account')
ON CONFLICT (challenge_type) DO NOTHING;

-- STEP 4: Create indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_challenge_type_rules_type ON challenge_type_rules(challenge_type);

-- Add comments
COMMENT ON TABLE challenge_type_rules IS 'Configurable risk parameters for each challenge type';
COMMENT ON CONSTRAINT valid_challenge_type ON challenges IS 'Enforces valid challenge type values including Lite and Prime variants';

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify the migration worked:
-- SELECT * FROM challenge_type_rules ORDER BY challenge_type;
-- SELECT DISTINCT challenge_type FROM challenges ORDER BY challenge_type;
