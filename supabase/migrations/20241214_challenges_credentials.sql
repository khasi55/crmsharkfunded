-- Add credentials columns to challenges table
ALTER TABLE public.challenges
ADD COLUMN IF NOT EXISTS login BIGINT,
ADD COLUMN IF NOT EXISTS master_password TEXT,
ADD COLUMN IF NOT EXISTS investor_password TEXT,
ADD COLUMN IF NOT EXISTS server TEXT DEFAULT 'SharkFunded-Demo',
ADD COLUMN IF NOT EXISTS platform TEXT,
ADD COLUMN IF NOT EXISTS model TEXT,
ADD COLUMN IF NOT EXISTS leverage NUMERIC DEFAULT 100;

-- Create constraint for unique login if not null
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'idx_challenges_login_unique') THEN
        ALTER TABLE public.challenges ADD CONSTRAINT idx_challenges_login_unique UNIQUE (login);
    END IF;
END $$;

-- Index for login
CREATE INDEX IF NOT EXISTS idx_challenges_login ON public.challenges(login);

COMMENT ON COLUMN public.challenges.login IS 'Trading account login number (MT4/MT5)';
COMMENT ON COLUMN public.challenges.master_password IS 'Trading account master password';
COMMENT ON COLUMN public.challenges.investor_password IS 'Trading account investor (read-only) password';
