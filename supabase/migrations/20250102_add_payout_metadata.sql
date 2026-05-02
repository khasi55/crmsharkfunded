-- Add metadata column to payout_requests table
ALTER TABLE public.payout_requests 
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.payout_requests.metadata IS 'Additional metadata like challenge_id, request_date, etc.';
