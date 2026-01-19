-- 1. Add total_commission to profiles if missing
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS total_commission DECIMAL(15, 2) DEFAULT 0.00;

-- 2. Create affiliate_earnings table if missing
CREATE TABLE IF NOT EXISTS public.affiliate_earnings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    referrer_id UUID NOT NULL REFERENCES public.profiles(id),
    referred_user_id UUID REFERENCES public.profiles(id),
    amount DECIMAL(15, 2) NOT NULL,
    commission_type TEXT DEFAULT 'purchase', -- 'purchase', 'recurring', etc.
    status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'cancelled'
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.affiliate_earnings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own earnings
DROP POLICY IF EXISTS "Users can view own earnings" ON public.affiliate_earnings;
CREATE POLICY "Users can view own earnings" ON public.affiliate_earnings
    FOR SELECT USING (auth.uid() = referrer_id);

-- 3. Create RPC Function to safely increment commission
CREATE OR REPLACE FUNCTION public.increment_affiliate_commission(
    p_user_id UUID,
    p_amount DECIMAL
)
RETURNS VOID AS $$
BEGIN
    UPDATE public.profiles
    SET total_commission = COALESCE(total_commission, 0) + p_amount
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT ALL ON public.affiliate_earnings TO service_role;
GRANT SELECT ON public.affiliate_earnings TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_affiliate_commission TO service_role;
