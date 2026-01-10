-- Create challenges table if it doesn't exist (Combined Migration)
CREATE TABLE IF NOT EXISTS public.challenges (
    -- Primary key
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User reference
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Challenge identification
    challenge_number text UNIQUE,
    challenge_type text NOT NULL DEFAULT 'Phase 1',
    
    -- Account details
    initial_balance numeric NOT NULL DEFAULT 100000,
    current_balance numeric NOT NULL DEFAULT 100000,
    current_equity numeric NOT NULL DEFAULT 100000,
    
    -- Status and metadata
    status text NOT NULL DEFAULT 'active',
    is_active boolean DEFAULT true,
    
    -- Credentials (NEW)
    login BIGINT UNIQUE,
    master_password TEXT,
    investor_password TEXT,
    server TEXT DEFAULT 'SharkFunded-Demo',
    platform TEXT,
    model TEXT,
    leverage NUMERIC DEFAULT 100,
    
    -- Challenge parameters
    profit_target numeric DEFAULT 8000,
    max_daily_loss numeric DEFAULT 5000,
    max_total_loss numeric DEFAULT 10000,
    
    -- Dates
    start_date timestamptz DEFAULT now(),
    end_date timestamptz,
    passed_date timestamptz,
    failed_date timestamptz,
    
    -- Timestamps
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    -- Additional metadata
    metadata jsonb DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_challenges_user_id ON public.challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_challenges_login ON public.challenges(login);

-- RLS
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own challenges" ON public.challenges
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own challenges" ON public.challenges
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own challenges" ON public.challenges
    FOR UPDATE USING (auth.uid() = user_id);
