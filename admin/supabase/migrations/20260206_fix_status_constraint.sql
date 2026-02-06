-- Migration: Update challenges status constraint
-- Description: Adds 'upgraded' and 'disabled' to the valid_status check constraint
-- Date: 2024-12-14

-- 1. Drop existing constraint
ALTER TABLE public.challenges DROP CONSTRAINT IF EXISTS valid_status;

-- 2. Add updated constraint with 'upgraded' and 'disabled'
ALTER TABLE public.challenges 
ADD CONSTRAINT valid_status 
CHECK (status IN ('active', 'passed', 'failed', 'closed', 'pending', 'upgraded', 'disabled'));

-- 3. Update comment
COMMENT ON COLUMN public.challenges.status IS 'Current status: active, passed, failed, closed, pending, upgraded, or disabled';
