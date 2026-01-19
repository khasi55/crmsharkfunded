
-- Drop function if exists to ensure clean slate
DROP FUNCTION IF EXISTS public.validate_coupon(TEXT, UUID, NUMERIC, TEXT);

-- Create Table If Not Exists
CREATE TABLE IF NOT EXISTS public.discount_coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    description TEXT,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
    max_discount_amount NUMERIC, 
    account_types TEXT[], 
    min_purchase_amount NUMERIC DEFAULT 0,
    max_uses INTEGER,
    uses_count INTEGER DEFAULT 0,
    max_uses_per_user INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Coupon Usage Tracking
CREATE TABLE IF NOT EXISTS public.coupon_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id UUID NOT NULL REFERENCES public.discount_coupons(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    order_id TEXT, -- Loose reference to order_id string
    discount_amount NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.discount_coupons(code);

-- RLS
ALTER TABLE public.discount_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_usage ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'discount_coupons' AND policyname = 'Coupons are publicly readable') THEN
        CREATE POLICY "Coupons are publicly readable" ON public.discount_coupons FOR SELECT USING (is_active = true);
    END IF;
END $$;

-- Create Validate Function
CREATE OR REPLACE FUNCTION public.validate_coupon(
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
    -- Fetch coupon (Case Insensitive)
    SELECT * INTO v_coupon
    FROM public.discount_coupons
    WHERE code = UPPER(p_code);
    
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
    
    -- Check account type applicability (Loose matching)
    -- If account_types is NULL, it applies to all.
    -- Otherwise, exact match OR substring match.
    IF v_coupon.account_types IS NOT NULL THEN
        IF NOT (p_account_type = ANY(v_coupon.account_types)) THEN 
            RETURN QUERY SELECT false, 0::NUMERIC, 'Coupon not valid for this account type';
            RETURN;
        END IF;
    END IF;
    
    -- Calculate discount
    IF v_coupon.discount_type = 'percentage' THEN
        v_discount := p_amount * (v_coupon.discount_value / 100);
        IF v_coupon.max_discount_amount IS NOT NULL THEN
            v_discount := LEAST(v_discount, v_coupon.max_discount_amount);
        END IF;
    ELSE
        v_discount := v_coupon.discount_value;
    END IF;
    
    v_discount := LEAST(v_discount, p_amount);
    
    RETURN QUERY SELECT true, v_discount, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- SECURITY DEFINER allows it to read coupon_usage even if user has no direct select access


-- Insert sample coupons
INSERT INTO public.discount_coupons (code, description, discount_type, discount_value, is_active)
VALUES
    ('WELCOME10', '10% off for new users', 'percentage', 10, true),
    ('SHARK50', 'Flat $50 off', 'fixed', 50, true),
    ('PRO20', '20% off on Pro accounts', 'percentage', 20, true)
ON CONFLICT (code) DO NOTHING;
