-- Create api_sessions table for hybrid JWT + Session Auth
CREATE TABLE IF NOT EXISTS public.api_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    ip_address TEXT,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    last_seen TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Add index for performance on session lookups
CREATE INDEX IF NOT EXISTS idx_api_sessions_user_id ON public.api_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_api_sessions_id_user_id_active ON public.api_sessions(id, user_id) WHERE is_active = true;

-- Basic RLS (Only service role/backend should manage this)
ALTER TABLE public.api_sessions ENABLE ROW LEVEL SECURITY;

-- Backend/Service Role Policy (Simplified for development, assuming backend uses service role)
CREATE POLICY "Service role can do everything on api_sessions"
ON public.api_sessions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Optional: Cleanup function for old sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    UPDATE public.api_sessions 
    SET is_active = false 
    WHERE last_seen < now() - interval '24 hours' 
    AND is_active = true;
END;
$$ LANGUAGE plpgsql;
