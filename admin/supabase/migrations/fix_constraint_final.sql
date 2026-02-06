-- Comprehensive constraint update that includes ALL possible values
-- First drop the constraint, then add it back with all values

ALTER TABLE challenges DROP CONSTRAINT IF EXISTS valid_challenge_type;

ALTER TABLE challenges ADD CONSTRAINT valid_challenge_type 
CHECK (challenge_type IN (
    -- Legacy values (OLD FORMAT - keep for backwards compatibility)
    'Instant',
    'Evaluation', 
    'Phase 1',
    'Phase 2',
    'Master Account',
    'Funded',
    'instant',
    'evaluation',
    'phase_1',
    'phase_2',
    'funded',
    'master_account',
    -- Lite variants (NEW FORMAT)
    'lite_instant',
    'lite_1_step',
    'lite_2_step',
    'lite_2_step_phase_1',
    'lite_2_step_phase_2',
    'lite_funded',
    -- Prime variants (NEW FORMAT)
    'prime_instant',
    'prime_1_step',
    'prime_2_step',
    'prime_2_step_phase_1',
    'prime_2_step_phase_2',
    'prime_funded',
    -- Competition
    'Competition',
    'competition',
    -- Other/Unknown
    'unknown',
    'other'
));

COMMENT ON CONSTRAINT valid_challenge_type ON challenges IS 
'Enforces valid challenge type values including Lite and Prime variants, Competition, and legacy formats';
