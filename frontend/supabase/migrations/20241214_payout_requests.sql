-- Create payout requests table
CREATE TABLE IF NOT EXISTS public.payout_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    amount NUMERIC NOT NULL CHECK (amount > 0),
    payout_method TEXT NOT NULL DEFAULT 'USDT_TRC20',
    wallet_address TEXT NOT NULL, -- Snapshot of wallet at time of request
    
    status TEXT NOT NULL DEFAULT 'pending', -- pending, processed, rejected
    rejection_reason TEXT,
    transaction_id TEXT, -- For blockchain tx hash
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own payouts" ON public.payout_requests
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payouts" ON public.payout_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Only admins/backend can update status (handled via service role usually, or specific admin policies)

-- Index
CREATE INDEX IF NOT EXISTS idx_payouts_user_id ON public.payout_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON public.payout_requests(status);

-- Comments
COMMENT ON TABLE public.payout_requests IS 'User payout/withdrawal requests';
