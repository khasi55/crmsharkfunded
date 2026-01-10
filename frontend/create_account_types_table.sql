-- ============================================
-- ACCOUNT TYPES / MT5 GROUPS TABLE
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Create account_types table
CREATE TABLE IF NOT EXISTS public.account_types (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    mt5_group_name TEXT NOT NULL UNIQUE,
    leverage INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    
    -- Additional Metadata
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create indexes
CREATE INDEX IF NOT EXISTS idx_account_types_mt5_group ON public.account_types(mt5_group_name);
CREATE INDEX IF NOT EXISTS idx_account_types_status ON public.account_types(status);

-- 3. Insert default account types
INSERT INTO public.account_types (name, mt5_group_name, leverage, status, description)
VALUES
    ('Instant Funding', 'demo\S\0-SF', 30, 'active', 'Instant funding account'),
    ('1 Step', 'demo\S\1-SF', 50, 'active', 'One step challenge account'),
    ('2 Step', 'demo\S\2-SF', 50, 'active', 'Two step challenge account'),
    ('SF Funded Live', 'SF Funded Live', 10, 'active', 'Live funded trading account'),
    ('Instant Funding Pro', 'demo\SF\0-Pro', 5, 'active', 'Pro instant funding account'),
    ('1 Step Pro', 'demo\SF\1-Pro', 100, 'active', 'Pro one step challenge'),
    ('2 Step Pro', 'demo\SF\2-Pro', 100, 'active', 'Pro two step challenge')
ON CONFLICT (name) DO NOTHING;

-- 4. Enable RLS
ALTER TABLE public.account_types ENABLE ROW LEVEL SECURITY;

-- 5. Create policy (all users can read)
DROP POLICY IF EXISTS "Account types are publicly readable" ON public.account_types;
CREATE POLICY "Account types are publicly readable"
    ON public.account_types FOR SELECT
    USING (true);

-- 6. Create function to get account type by name
CREATE OR REPLACE FUNCTION public.get_account_type_by_name(type_name TEXT)
RETURNS TABLE (
    id INTEGER,
    name TEXT,
    mt5_group_name TEXT,
    leverage INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        at.id,
        at.name,
        at.mt5_group_name,
        at.leverage
    FROM public.account_types at
    WHERE at.name = type_name
    AND at.status = 'active'
    LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- 7. Add account_type_id to challenges table (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'challenges' 
        AND column_name = 'account_type_id'
    ) THEN
        ALTER TABLE public.challenges 
        ADD COLUMN account_type_id INTEGER REFERENCES public.account_types(id);
        
        CREATE INDEX IF NOT EXISTS idx_challenges_account_type 
        ON public.challenges(account_type_id);
    END IF;
END $$;

-- 8. Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Account Types table created successfully!';
    RAISE NOTICE '📊 Inserted 7 account type configurations';
    RAISE NOTICE '� Ready for MT5 account creation';
END $$;

-- 9. View all account types
SELECT 
    id,
    name,
    mt5_group_name,
    leverage,
    status
FROM public.account_types
ORDER BY id;
