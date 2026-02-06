-- Step 2: Drop the old constraint and add the new one with ALL values
-- This includes Master Account which was missing

ALTER TABLE challenges DROP CONSTRAINT IF EXISTS valid_challenge_type;

ALTER TABLE challenges ADD CONSTRAINT valid_challenge_type 
CHECK (challenge_type IN (
    -- Old values (keep for compatibility)
    'Instant',
    'Evaluation', 
    'Phase 1',
    'Phase 2',
    'Master Account',  -- This was missing!
    'Funded',
    'instant',
    'evaluation',
    'phase_1',
    'phase_2',
    'funded',
    'master_account',
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
