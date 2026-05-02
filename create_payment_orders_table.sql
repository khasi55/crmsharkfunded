-- ============================================
-- PAYMENT ORDERS TABLE
-- Tracks payment transactions for challenge purchases
-- ============================================

CREATE TABLE IF NOT EXISTS public.payment_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Order Details
    order_id TEXT NOT NULL UNIQUE,
    amount NUMERIC NOT NULL,
    currency TEXT DEFAULT 'USD',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'expired')),
    
    -- Challenge Purchase Details
    account_type_name TEXT NOT NULL,
    account_type_id INTEGER REFERENCES public.account_types(id),
    account_size NUMERIC NOT NULL,
    platform TEXT NOT NULL,
    model TEXT NOT NULL,
    
    -- Payment Gateway Details
    payment_gateway TEXT, -- 'razorpay', 'stripe', 'paypal', etc.
    payment_id TEXT, -- Gateway payment ID
    payment_method TEXT, -- 'upi', 'card', 'netbanking', etc.
    
    -- Coupon/Discount
    coupon_code TEXT,
    discount_amount NUMERIC DEFAULT 0,
    
    -- Challenge Assignment
    challenge_id UUID REFERENCES public.challenges(id),
    is_account_created BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    paid_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 minutes'),
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_orders_user ON public.payment_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_order_id ON public.payment_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON public.payment_orders(status);
CREATE INDEX IF NOT EXISTS idx_payment_orders_payment_id ON public.payment_orders(payment_id);

-- Enable RLS
ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own orders" ON public.payment_orders;
CREATE POLICY "Users can view own orders"
    ON public.payment_orders FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own orders" ON public.payment_orders;
CREATE POLICY "Users can create own orders"
    ON public.payment_orders FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Function to generate unique order ID
CREATE OR REPLACE FUNCTION generate_order_id()
RETURNS TEXT AS $$
BEGIN
    RETURN 'SF-ORDER-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 8));
END;
$$ LANGUAGE plpgsql;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Payment Orders table created successfully!';
    RAISE NOTICE '💳 Ready for payment gateway integration';
END $$;
