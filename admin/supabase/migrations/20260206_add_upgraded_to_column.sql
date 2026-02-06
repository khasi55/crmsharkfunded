-- Add upgraded_to column to track upgrades
ALTER TABLE challenges
ADD COLUMN IF NOT EXISTS upgraded_to uuid REFERENCES challenges(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_challenges_upgraded_to ON challenges(upgraded_to);

-- Add comment
COMMENT ON COLUMN challenges.upgraded_to IS 'References the new challenge ID when this account is upgraded to next phase';
