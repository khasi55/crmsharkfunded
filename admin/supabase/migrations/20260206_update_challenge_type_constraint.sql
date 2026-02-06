-- Add new challenge_type values to the constraint
ALTER TABLE challenges DROP CONSTRAINT IF EXISTS valid_challenge_type;

ALTER TABLE challenges ADD CONSTRAINT valid_challenge_type 
CHECK (challenge_type IN (
    -- Old values (keep for compatibility)
    'Instant',
    'Evaluation', 
    'Phase 1',
    'Phase 2',
    'Funded',
    'instant',
    'evaluation',
    'phase_1',
    'phase_2',
    'funded',
    -- New Lite values
    'lite_instant',
    'lite_1_step',
    'lite_2_step_phase_1',
    'lite_2_step_phase_2',
    'lite_funded',
    -- New Prime values
    'prime_instant',
    'prime_1_step',
    'prime_2_step_phase_1',
    'prime_2_step_phase_2',
    'prime_funded',
    -- Other
    'Competition',
    'competition',
    'unknown'
));

COMMENT ON CONSTRAINT valid_challenge_type ON challenges IS 
'Enforces valid challenge type values including Lite and Prime variants';
