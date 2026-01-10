-- Add 'group' column for linking to Risk Rules
ALTER TABLE public.challenges 
ADD COLUMN IF NOT EXISTS "group" text DEFAULT 'demo\risk_test';

-- Add 'start_of_day_equity' for Daily Drawdown calculations
ALTER TABLE public.challenges 
ADD COLUMN IF NOT EXISTS "start_of_day_equity" numeric DEFAULT 100000;

-- Initialize existing rows (best guess)
UPDATE public.challenges 
SET start_of_day_equity = initial_balance 
WHERE start_of_day_equity IS NULL OR start_of_day_equity = 0;

-- Optional: Index on group for faster rule lookup joins (if needed)
CREATE INDEX IF NOT EXISTS idx_challenges_group ON public.challenges("group");
