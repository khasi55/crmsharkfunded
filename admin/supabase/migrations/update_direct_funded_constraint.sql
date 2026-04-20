ALTER TABLE public.challenges DROP CONSTRAINT IF EXISTS valid_challenge_type;

ALTER TABLE public.challenges ADD CONSTRAINT valid_challenge_type 
CHECK (challenge_type IN (
    -- Old legacy values (required so existing rows don't cause an error during constraint creation)
    'Instant', 'Evaluation', 'Phase 1', 'Phase 2', 'Funded',
    'instant', 'evaluation', 'phase_1', 'phase_2', 'funded',
    'lite_2_step', 'prime_2_step',
    
    -- New Lite values
    'lite_instant', 'lite_1_step', 'lite_2_step_phase_1', 'lite_2_step_phase_2', 'lite_funded',
    
    -- New Prime values
    'prime_instant', 'prime_1_step', 'prime_2_step_phase_1', 'prime_2_step_phase_2', 'prime_funded',
    
    -- Direct Funded
    'direct_funded',
    
    -- Other
    'Competition', 'competition', 'unknown'
));

INSERT INTO challenge_type_rules (challenge_type, profit_target_percent, daily_drawdown_percent, max_drawdown_percent, description) VALUES
('direct_funded', 0, 3.00, 6.00, 'Direct Funded Account')
ON CONFLICT (challenge_type) DO 
    UPDATE SET 
        profit_target_percent = EXCLUDED.profit_target_percent,
        daily_drawdown_percent = EXCLUDED.daily_drawdown_percent,
        max_drawdown_percent = EXCLUDED.max_drawdown_percent;
