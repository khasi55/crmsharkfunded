-- Add new risk columns if they don't exist
ALTER TABLE risk_rules_config 
ADD COLUMN IF NOT EXISTS allow_hedging BOOLEAN DEFAULT TRUE;

ALTER TABLE risk_rules_config 
ADD COLUMN IF NOT EXISTS allow_martingale BOOLEAN DEFAULT TRUE;

-- Optional: Set them to FALSE for specific groups to test violations immediately
-- UPDATE risk_rules_config SET allow_hedging = false, allow_martingale = false WHERE mt5_group_name = 'demo\S\2-SF';
