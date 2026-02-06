-- Fix RLS policies for advanced_risk_flags to allow admin access
-- Drop existing policies
DROP POLICY IF EXISTS "Users view own advanced flags" ON public.advanced_risk_flags;
DROP POLICY IF EXISTS "Users/System insert advanced flags" ON public.advanced_risk_flags;

-- Create new policies
-- 1. Users can view their own flags
CREATE POLICY "Users view own advanced flags" 
ON public.advanced_risk_flags FOR SELECT 
USING (auth.uid() = user_id);

-- 2. Service role can do everything (for backend/admin)
CREATE POLICY "Service role full access to advanced flags"
ON public.advanced_risk_flags
USING (true)
WITH CHECK (true);

-- 3. Allow insert for service role
CREATE POLICY "Service role insert advanced flags" 
ON public.advanced_risk_flags FOR INSERT 
WITH CHECK (true);

-- Verify the table exists
SELECT COUNT(*) as total_violations FROM advanced_risk_flags;
