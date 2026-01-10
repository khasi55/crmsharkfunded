-- Migration: Add Challenges/Accounts Table
-- Description: Creates challenges table to store user account information for prop trading challenges
-- Date: 2024-12-14

-- Drop existing table if exists (for clean migration)
DROP TABLE IF EXISTS public.challenges CASCADE;

-- Create challenges table
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
    
    -- Additional metadata (JSON for flexibility)
    metadata jsonb DEFAULT '{}'::jsonb,
    
    -- Constraints
    CONSTRAINT valid_challenge_type CHECK (challenge_type IN ('Phase 1', 'Phase 2', 'Instant', 'Master Account', 'Evaluation')),
    CONSTRAINT valid_status CHECK (status IN ('active', 'passed', 'failed', 'closed', 'pending')),
    CONSTRAINT positive_balances CHECK (
        initial_balance > 0 AND 
        current_balance >= 0 AND 
        current_equity >= 0
    )
);

-- Create indexes for performance
CREATE INDEX idx_challenges_user_id ON public.challenges(user_id);
CREATE INDEX idx_challenges_status ON public.challenges(status);
CREATE INDEX idx_challenges_challenge_type ON public.challenges(challenge_type);
CREATE INDEX idx_challenges_is_active ON public.challenges(is_active);
CREATE INDEX idx_challenges_created_at ON public.challenges(created_at DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_challenges_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_challenges_updated_at
    BEFORE UPDATE ON public.challenges
    FOR EACH ROW
    EXECUTE FUNCTION public.update_challenges_updated_at();

-- Function to auto-generate challenge number
CREATE OR REPLACE FUNCTION public.generate_challenge_number()
RETURNS TRIGGER AS $$
DECLARE
    new_number text;
    counter integer := 1;
BEGIN
    -- Generate challenge number if not provided
    IF NEW.challenge_number IS NULL THEN
        LOOP
            new_number := 'SF' || LPAD(counter::text, 4, '0');
            -- Check if number exists
            IF NOT EXISTS (SELECT 1 FROM public.challenges WHERE challenge_number = new_number) THEN
                EXIT;
            END IF;
            counter := counter + 1;
        END LOOP;
        NEW.challenge_number = new_number;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER generate_challenge_number_trigger
    BEFORE INSERT ON public.challenges
    FOR EACH ROW
    EXECUTE FUNCTION public.generate_challenge_number();

-- Function to update challenge status based on balance
CREATE OR REPLACE FUNCTION public.update_challenge_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if profit target reached
    IF (NEW.current_balance - NEW.initial_balance) >= NEW.profit_target THEN
        NEW.status = 'passed';
        NEW.passed_date = now();
    -- Check if max loss exceeded
    ELSIF (NEW.initial_balance - NEW.current_balance) >= NEW.max_total_loss THEN
        NEW.status = 'failed';
        NEW.failed_date = now();
        NEW.is_active = false;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_challenge_status_trigger
    BEFORE UPDATE OF current_balance ON public.challenges
    FOR EACH ROW
    EXECUTE FUNCTION public.update_challenge_status();

-- Enable Row Level Security
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Policy: Users can view their own challenges
CREATE POLICY "Users can view own challenges"
    ON public.challenges
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own challenges
CREATE POLICY "Users can create own challenges"
    ON public.challenges
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own challenges
CREATE POLICY "Users can update own challenges"
    ON public.challenges
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own challenges
CREATE POLICY "Users can delete own challenges"
    ON public.challenges
    FOR DELETE
    USING (auth.uid() = user_id);

-- Add helpful comments
COMMENT ON TABLE public.challenges IS 'Stores user trading challenge/account information';
COMMENT ON COLUMN public.challenges.user_id IS 'Reference to the user who owns this challenge';
COMMENT ON COLUMN public.challenges.challenge_number IS 'Unique challenge identifier (e.g., SF0001)';
COMMENT ON COLUMN public.challenges.challenge_type IS 'Type of challenge: Phase 1, Phase 2, Instant, Master Account, or Evaluation';
COMMENT ON COLUMN public.challenges.status IS 'Current status: active, passed, failed, closed, or pending';
COMMENT ON COLUMN public.challenges.current_balance IS 'Current account balance';
COMMENT ON COLUMN public.challenges.current_equity IS 'Current account equity (balance + floating P&L)';

-- Insert sample data for testing (optional - remove in production)
-- Uncomment the following for development/testing
/*
INSERT INTO public.challenges (user_id, challenge_type, initial_balance, current_balance, current_equity, status) VALUES
    ((SELECT id FROM auth.users LIMIT 1), 'Phase 1', 100000, 94949, 94949, 'active'),
    ((SELECT id FROM auth.users LIMIT 1), 'Phase 2', 100000, 100000, 100000, 'active'),
    ((SELECT id FROM auth.users LIMIT 1), 'Instant', 100000, 94866.47, 94866.47, 'active'),
    ((SELECT id FROM auth.users LIMIT 1), 'Master Account', 100000, 109988.32, 109988.32, 'passed');
*/

-- Update trades table to reference challenges (if not already done)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trades' AND column_name = 'challenge_id'
    ) THEN
        ALTER TABLE public.trades 
        ADD COLUMN challenge_id uuid REFERENCES public.challenges(id) ON DELETE CASCADE;
        
        CREATE INDEX idx_trades_challenge_id ON public.trades(challenge_id);
    ELSE
        -- If column exists, ensure foreign key is set
        ALTER TABLE public.trades 
        DROP CONSTRAINT IF EXISTS trades_challenge_id_fkey;
        
        ALTER TABLE public.trades
        ADD CONSTRAINT trades_challenge_id_fkey 
        FOREIGN KEY (challenge_id) REFERENCES public.challenges(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenges TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
