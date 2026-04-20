
-- Add profit_share_percent to challenge_type_rules
ALTER TABLE IF EXISTS challenge_type_rules 
ADD COLUMN IF NOT EXISTS profit_share_percent INTEGER DEFAULT 80;

-- Update existing rules to 80% if they were null or default
UPDATE challenge_type_rules SET profit_share_percent = 80 WHERE profit_share_percent IS NULL;

-- Optionally, set Lite to something else if needed? The user mentioned half payout.
-- If they want Lite to be 50%, we can do:
-- UPDATE challenge_type_rules SET profit_share_percent = 50 WHERE challenge_type ILIKE '%lite%';
-- But for now I will stick to 80 as a safe default and let them configure it.
