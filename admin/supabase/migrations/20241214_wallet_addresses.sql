-- Create wallet addresses table
-- References auth.users directly (not profiles) for consistency
CREATE TABLE IF NOT EXISTS public.wallet_addresses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Wallet details
    wallet_type TEXT NOT NULL DEFAULT 'USDT_TRC20', -- 'USDT_TRC20', 'BTC', 'ETH', etc.
    wallet_address TEXT NOT NULL,
    wallet_label TEXT, -- Optional user label like "Main Wallet"
    
    -- Lock status - once added, cannot be edited for security
    is_locked BOOLEAN DEFAULT TRUE,
    locked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Metadata
    is_primary BOOLEAN DEFAULT TRUE, -- Primary withdrawal wallet
    is_verified BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.wallet_addresses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own wallets" ON public.wallet_addresses
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wallets" ON public.wallet_addresses
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users cannot update locked wallets" ON public.wallet_addresses
    FOR UPDATE USING (auth.uid() = user_id AND is_locked = FALSE);

CREATE POLICY "Users cannot delete locked wallets" ON public.wallet_addresses
    FOR DELETE USING (auth.uid() = user_id AND is_locked = FALSE);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_wallet_user_id ON public.wallet_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_primary ON public.wallet_addresses(user_id, is_primary);

-- Add comment
COMMENT ON TABLE public.wallet_addresses IS 'User wallet addresses for withdrawals - locked once added for security';
