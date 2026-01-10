-- ============================================
-- DISCOUNT COUPONS TABLE
-- Manage promotional codes and discounts
-- ============================================

CREATE TABLE IF NOT EXISTS public.discount_coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Coupon Details
    code TEXT NOT NULL UNIQUE,
    description TEXT,
    
    -- Discount Configuration
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
    max_discount_amount NUMERIC, -- Max discount cap for percentage type
    
    -- Applicability
    account_types TEXT[], -- NULL = all types, or ['Instant Funding', '1 Step']
    min_purchase_amount NUMERIC DEFAULT 0,
    
    -- Usage Limits
    max_uses INTEGER, -- NULL = unlimited
    uses_count INTEGER DEFAULT 0,
    max_uses_per_user INTEGER DEFAULT 1,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Validity Period
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Coupon Usage Tracking
CREATE TABLE IF NOT EXISTS public.coupon_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id UUID NOT NULL REFERENCES public.discount_coupons(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    order_id TEXT REFERENCES public.payment_orders(order_id),
    discount_amount NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(coupon_id, order_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.discount_coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON public.discount_coupons(is_active);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_user ON public.coupon_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon ON public.coupon_usage(coupon_id);

-- Enable RLS
ALTER TABLE public.discount_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Coupons are publicly readable"
    ON public.discount_coupons FOR SELECT
    USING (is_active = true);

CREATE POLICY "Users can view own coupon usage"
    ON public.coupon_usage FOR SELECT
    USING (auth.uid() = user_id);

-- Function to validate and calculate discount
CREATE OR REPLACE FUNCTION validate_coupon(
    p_code TEXT,
    p_user_id UUID,
    p_amount NUMERIC,
    p_account_type TEXT
)
RETURNS TABLE (
    is_valid BOOLEAN,
    discount_amount NUMERIC,
    error_message TEXT
) AS $$
DECLARE
    v_coupon public.discount_coupons%ROWTYPE;
    v_user_usage_count INTEGER;
    v_discount NUMERIC;
BEGIN
    -- Fetch coupon
    SELECT * INTO v_coupon
    FROM public.discount_coupons
    WHERE code = p_code;
    
    -- Check if coupon exists
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 0::NUMERIC, 'Invalid coupon code';
        RETURN;
    END IF;
    
    -- Check if active
    IF NOT v_coupon.is_active THEN
        RETURN QUERY SELECT false, 0::NUMERIC, 'Coupon is inactive';
        RETURN;
    END IF;
    
    -- Check validity period
    IF v_coupon.valid_from > NOW() THEN
        RETURN QUERY SELECT false, 0::NUMERIC, 'Coupon not yet valid';
        RETURN;
    END IF;
    
    IF v_coupon.valid_until IS NOT NULL AND v_coupon.valid_until < NOW() THEN
        RETURN QUERY SELECT false, 0::NUMERIC, 'Coupon has expired';
        RETURN;
    END IF;
    
    -- Check max uses
    IF v_coupon.max_uses IS NOT NULL AND v_coupon.uses_count >= v_coupon.max_uses THEN
        RETURN QUERY SELECT false, 0::NUMERIC, 'Coupon usage limit reached';
        RETURN;
    END IF;
    
    -- Check user usage
    SELECT COUNT(*) INTO v_user_usage_count
    FROM public.coupon_usage
    WHERE coupon_id = v_coupon.id AND user_id = p_user_id;
    
    IF v_coupon.max_uses_per_user IS NOT NULL AND v_user_usage_count >= v_coupon.max_uses_per_user THEN
        RETURN QUERY SELECT false, 0::NUMERIC, 'You have already used this coupon';
        RETURN;
    END IF;
    
    -- Check min purchase amount
    IF p_amount < v_coupon.min_purchase_amount THEN
        RETURN QUERY SELECT false, 0::NUMERIC, 'Minimum purchase amount not met';
        RETURN;
    END IF;
    
    -- Check account type applicability
    IF v_coupon.account_types IS NOT NULL AND NOT (p_account_type = ANY(v_coupon.account_types)) THEN
        RETURN QUERY SELECT false, 0::NUMERIC, 'Coupon not valid for this account type';
        RETURN;
    END IF;
    
    -- Calculate discount
    IF v_coupon.discount_type = 'percentage' THEN
        v_discount := p_amount * (v_coupon.discount_value / 100);
        -- Apply max discount cap if set
        IF v_coupon.max_discount_amount IS NOT NULL THEN
            v_discount := LEAST(v_discount, v_coupon.max_discount_amount);
        END IF;
    ELSE
        v_discount := v_coupon.discount_value;
    END IF;
    
    -- Ensure discount doesn't exceed amount
    v_discount := LEAST(v_discount, p_amount);
    
    RETURN QUERY SELECT true, v_discount, NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Insert sample coupons
INSERT INTO public.discount_coupons (code, description, discount_type, discount_value, is_active)
VALUES
    ('WELCOME10', '10% off for new users', 'percentage', 10, true),
    ('SHARK50', 'Flat ₹50 off', 'fixed', 50, true),
    ('PRO20', '20% off on Pro accounts', 'percentage', 20, true)
ON CONFLICT (code) DO NOTHING;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Discount coupons table created!';
    RAISE NOTICE '🎫 Sample coupons: WELCOME10, SHARK50, PRO20';
END $$;
