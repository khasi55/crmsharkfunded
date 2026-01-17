-- Fix for "column profiles.wallet_balance does not exist" error
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS wallet_balance DECIMAL(15, 2) DEFAULT 0.00;

-- Optional: Allow RLS access if needed (usually profiles are readable by owner)
-- POLICY is usually already set for "Users can read own profile"
