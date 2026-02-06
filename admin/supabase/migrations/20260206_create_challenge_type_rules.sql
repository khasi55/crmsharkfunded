-- Create challenge_type_rules table for dynamic risk configuration
CREATE TABLE IF NOT EXISTS challenge_type_rules (
    challenge_type TEXT PRIMARY KEY,
    profit_target_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
    daily_drawdown_percent DECIMAL(5,2) NOT NULL,
    max_drawdown_percent DECIMAL(5,2) NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default values for all challenge types
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

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_challenge_type_rules_type ON challenge_type_rules(challenge_type);

COMMENT ON TABLE challenge_type_rules IS 'Configurable risk parameters for each challenge type';
