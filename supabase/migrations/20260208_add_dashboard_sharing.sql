-- Migration: Add Dashboard Sharing
-- Description: Adds is_public and share_token to challenges for public performance sharing
-- Date: 2026-02-08

-- Add is_public and share_token columns to challenges table
ALTER TABLE public.challenges 
ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS share_token text UNIQUE;

-- Create index for fast lookups by share_token
CREATE INDEX IF NOT EXISTS idx_challenges_share_token ON public.challenges(share_token);

-- Update RLS for public access if needed (optional, depends on if we use Supabase directly or Backend)
-- If we use Backend, it handles public access via its own routes.
-- Adding a policy as a secondary layer if someone uses the client lib.
CREATE POLICY "Public can view shared challenges" 
ON public.challenges FOR SELECT 
USING (is_public = true);

-- Also need a policy for trades if we want to fetch them directly
CREATE POLICY "Public can view shared trades" 
ON public.trades FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.challenges 
        WHERE challenges.id = trades.challenge_id 
        AND challenges.is_public = true
    )
);
