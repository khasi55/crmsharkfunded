-- Add profit_target_percent column to mt5_risk_groups table
-- This allows each group to have its own profit target configuration

ALTER TABLE mt5_risk_groups 
ADD COLUMN IF NOT EXISTS profit_target_percent DECIMAL(5, 2) DEFAULT 8.0;

-- Update existing groups with the new profit target values
-- Based on your specifications:

-- Instant accounts (0% profit target)
UPDATE mt5_risk_groups 
SET profit_target_percent = 0.0
WHERE group_name IN ('demo\S\0-SF', 'SF Funded Live');

-- 1-Step accounts (9% profit target)
UPDATE mt5_risk_groups 
SET profit_target_percent = 9.0
WHERE group_name IN ('demo\S\1-SF', 'demo\SF\1-Pro');

-- 2-Step accounts - Phase 1 and Phase 2 will be handled programmatically
-- For now, set default to Phase 1 value (9% for Standard, 6% for Pro)
UPDATE mt5_risk_groups 
SET profit_target_percent = 9.0
WHERE group_name = 'demo\S\2-SF';

UPDATE mt5_risk_groups 
SET profit_target_percent = 6.0
WHERE group_name = 'demo\SF\2-Pro';

-- Pro Instant accounts (8% profit target)
UPDATE mt5_risk_groups 
SET profit_target_percent = 8.0
WHERE group_name = 'demo\SF\0-Pro';

-- Competition accounts (no profit target specified, keep default 8%)
-- UPDATE mt5_risk_groups 
-- SET profit_target_percent = 8.0
-- WHERE group_name = 'demo\SF\0-Demo\comp';

-- Update drawdown settings as per your specifications

-- demo\S\0-SF
UPDATE mt5_risk_groups 
SET max_drawdown_percent = 7.0, daily_drawdown_percent = 4.0
WHERE group_name = 'demo\S\0-SF';

-- demo\S\1-SF
UPDATE mt5_risk_groups 
SET max_drawdown_percent = 7.0, daily_drawdown_percent = 4.0
WHERE group_name = 'demo\S\1-SF';

-- demo\S\2-SF
UPDATE mt5_risk_groups 
SET max_drawdown_percent = 10.0, daily_drawdown_percent = 4.0
WHERE group_name = 'demo\S\2-SF';

-- demo\SF\0-Pro
UPDATE mt5_risk_groups 
SET max_drawdown_percent = 3.0, daily_drawdown_percent = 0.0
WHERE group_name = 'demo\SF\0-Pro';

-- demo\SF\1-Pro
UPDATE mt5_risk_groups 
SET max_drawdown_percent = 6.0, daily_drawdown_percent = 3.0
WHERE group_name = 'demo\SF\1-Pro';

-- demo\SF\2-Pro
UPDATE mt5_risk_groups 
SET max_drawdown_percent = 6.0, daily_drawdown_percent = 3.0
WHERE group_name = 'demo\SF\2-Pro';

-- SF Funded Live
UPDATE mt5_risk_groups 
SET max_drawdown_percent = 7.0, daily_drawdown_percent = 4.0
WHERE group_name = 'SF Funded Live';

-- demo\SF\0-Demo\comp
UPDATE mt5_risk_groups 
SET max_drawdown_percent = 6.0, daily_drawdown_percent = 3.0
WHERE group_name = 'demo\SF\0-Demo\comp';

-- Show updated values
SELECT group_name, max_drawdown_percent, daily_drawdown_percent, profit_target_percent 
FROM mt5_risk_groups 
ORDER BY group_name;
