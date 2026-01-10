
-- Update challenge_type constraint to allow 'Competition'
ALTER TABLE public.challenges DROP CONSTRAINT IF EXISTS valid_challenge_type;
ALTER TABLE public.challenges ADD CONSTRAINT valid_challenge_type 
CHECK (challenge_type IN ('lite_1_step', 'lite_2_step', 'lite_instant', 'prime_1_step', 'prime_2_step', 'prime_instant', 'funded', 'Evaluation', 'Instant', 'Phase 1', 'Phase 2', 'Competition'));
