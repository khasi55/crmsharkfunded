-- Migration: Add challenge_type to mt5_risk_groups for phase-specific profit targets
-- This allows the same MT5 group to have different profit targets for Phase 1, Phase 2, and Funded

-- Step 1: Add challenge_type column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'mt5_risk_groups' AND column_name = 'challenge_type'
    ) THEN
        ALTER TABLE mt5_risk_groups 
        ADD COLUMN challenge_type TEXT DEFAULT 'Phase 1';
        
        RAISE NOTICE 'Added challenge_type column to mt5_risk_groups';
    END IF;
END $$;

-- Step 2: Drop the old unique constraint on group_name only
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'mt5_risk_groups_group_name_key'
    ) THEN
        ALTER TABLE mt5_risk_groups 
        DROP CONSTRAINT mt5_risk_groups_group_name_key;
        
        RAISE NOTICE 'Dropped old unique constraint on group_name';
    END IF;
END $$;

-- Step 3: Add new composite unique constraint on (group_name, challenge_type)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'mt5_risk_groups_group_phase_key'
    ) THEN
        ALTER TABLE mt5_risk_groups 
        ADD CONSTRAINT mt5_risk_groups_group_phase_key 
        UNIQUE (group_name, challenge_type);
        
        RAISE NOTICE 'Added composite unique constraint on (group_name, challenge_type)';
    END IF;
END $$;

-- Step 4: Insert phase-specific configurations for existing groups
-- This is a one-time data migration to create Phase 2 and Funded entries

-- For 2-Step challenges (demo\SF\2 and demo\S\2-SF), add Phase 2 and Funded entries
INSERT INTO mt5_risk_groups (group_name, challenge_type, max_drawdown_percent, daily_drawdown_percent, profit_target_percent)
VALUES 
    -- Lite 2-Step: Phase 2
    ('demo\SF\2', 'Phase 2', 6.0, 3.0, 6.0),
    -- Lite 2-Step: Funded (no profit target, but keep DD limits)
    ('demo\SF\2', 'funded', 6.0, 3.0, 0.0),
    
    -- Prime 2-Step: Phase 2
    ('demo\S\2-SF', 'Phase 2', 8.0, 4.0, 6.0),
    -- Prime 2-Step: Funded
    ('demo\S\2-SF', 'funded', 10.0, 5.0, 0.0)
ON CONFLICT (group_name, challenge_type) DO NOTHING;

-- For 1-Step challenges (demo\SF\1 and demo\S\1-SF), add Funded entries
INSERT INTO mt5_risk_groups (group_name, challenge_type, max_drawdown_percent, daily_drawdown_percent, profit_target_percent)
VALUES 
    -- Lite 1-Step: Funded
    ('demo\SF\1', 'funded', 6.0, 3.0, 0.0),
    
    -- Prime 1-Step: Funded  
    ('demo\S\1-SF', 'funded', 10.0, 5.0, 0.0)
ON CONFLICT (group_name, challenge_type) DO NOTHING;

-- Update existing Phase 1 entries to have correct challenge_type
UPDATE mt5_risk_groups 
SET challenge_type = 'Phase 1' 
WHERE challenge_type IS NULL OR challenge_type = 'Phase 1';

RAISE NOTICE 'Migration complete: mt5_risk_groups now supports phase-specific profit targets';
