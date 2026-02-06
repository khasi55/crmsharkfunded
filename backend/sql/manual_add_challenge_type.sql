-- Simple manual migration for Supabase SQL Editor
-- Run this in your Supabase SQL Editor to add phase-specific profit target support

-- 1. Add challenge_type column
ALTER TABLE mt5_risk_groups 
ADD COLUMN IF NOT EXISTS challenge_type TEXT DEFAULT 'Phase 1';

-- 2. Make composite unique constraint (you may need to drop old constraint first)
-- First drop the old unique constraint if it exists
ALTER TABLE mt5_risk_groups DROP CONSTRAINT IF EXISTS mt5_risk_groups_group_name_key;

-- Add new composite unique constraint
ALTER TABLE mt5_risk_groups 
ADD CONSTRAINT mt5_risk_groups_group_phase_key 
UNIQUE (group_name, challenge_type);

-- 3. Insert phase-specific configurations
-- Lite Groups
INSERT INTO mt5_risk_groups (group_name, challenge_type, max_drawdown_percent, daily_drawdown_percent, profit_target_percent)
VALUES 
    ('demo\SF\0', 'instant', 8.0, 4.0, 0.0),
    ('demo\SF\1', 'Phase 1', 6.0, 3.0, 8.0),
    ('demo\SF\1', 'funded', 6.0, 3.0, 0.0),
    ('demo\SF\2', 'Phase 1', 6.0, 3.0, 6.0),
    ('demo\SF\2', 'Phase 2', 6.0, 3.0, 6.0),
    ('demo\SF\2', 'funded', 6.0, 3.0, 0.0)
ON CONFLICT (group_name, challenge_type) DO NOTHING;

-- Prime Groups
INSERT INTO mt5_risk_groups (group_name, challenge_type, max_drawdown_percent, daily_drawdown_percent, profit_target_percent)
VALUES 
    ('demo\S\0-SF', 'instant', 8.0, 4.0, 0.0),
    ('demo\S\1-SF', 'Phase 1', 6.0, 4.0, 8.0),
    ('demo\S\1-SF', 'funded', 10.0, 5.0, 0.0),
    ('demo\S\2-SF', 'Phase 1', 8.0, 4.0, 6.0),
    ('demo\S\2-SF', 'Phase 2', 8.0, 4.0, 6.0),
    ('demo\S\2-SF', 'funded', 10.0, 5.0, 0.0)
ON CONFLICT (group_name, challenge_type) DO NOTHING;

-- Funded & Competition
INSERT INTO mt5_risk_groups (group_name, challenge_type, max_drawdown_percent, daily_drawdown_percent, profit_target_percent)
VALUES 
    ('SF Funded Live', 'funded', 10.0, 5.0, 0.0),
    ('demo\SF\0-Demo\comp', 'competition', 10.0, 5.0, 0.0)
ON CONFLICT (group_name, challenge_type) DO NOTHING;
