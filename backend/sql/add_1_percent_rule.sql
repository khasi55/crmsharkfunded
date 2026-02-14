-- Add max_single_loss_percent column to risk_rules_config table
ALTER TABLE risk_rules_config 
ADD COLUMN IF NOT EXISTS max_single_loss_percent FLOAT DEFAULT 0;

-- Update config for Instant Accounts (assuming group names contain 'Instant' or 'SF')
-- Modify these WHERE clauses to match your actual group names in production
UPDATE risk_rules_config
SET max_single_loss_percent = 1
WHERE mt5_group_name ILIKE '%Instant%' OR mt5_group_name ILIKE '%Funded%' OR mt5_group_name ILIKE '%Lite%';

-- Ensure Tick Scalping is enabled (120s) where needed as per user request
UPDATE risk_rules_config
SET min_trade_duration_seconds = 120
WHERE mt5_group_name ILIKE '%Lite%' AND (min_trade_duration_seconds IS NULL OR min_trade_duration_seconds = 0);

-- Verify changes
SELECT mt5_group_name, max_single_loss_percent, min_trade_duration_seconds FROM risk_rules_config WHERE max_single_loss_percent > 0;
