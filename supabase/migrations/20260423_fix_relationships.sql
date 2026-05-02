-- Add explicit foreign key relationship between kyc_sessions and profiles
-- This helps PostgREST (Supabase API) resolve relationships for joins

ALTER TABLE IF EXISTS public.kyc_sessions
DROP CONSTRAINT IF EXISTS kyc_sessions_profiles_fkey;

ALTER TABLE IF EXISTS public.kyc_sessions
ADD CONSTRAINT kyc_sessions_profiles_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Also check challenges table for similar relationship issues with profiles
ALTER TABLE IF EXISTS public.challenges
DROP CONSTRAINT IF EXISTS challenges_profiles_fkey;

ALTER TABLE IF EXISTS public.challenges
ADD CONSTRAINT challenges_profiles_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

COMMENT ON CONSTRAINT kyc_sessions_profiles_fkey ON public.kyc_sessions IS 'Explicit relationship to profiles for PostgREST joins';
COMMENT ON CONSTRAINT challenges_profiles_fkey ON public.challenges IS 'Explicit relationship to profiles for PostgREST joins';
