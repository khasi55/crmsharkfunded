-- Fix validate_coupon function to calculate uses_count dynamically
DROP FUNCTION IF EXISTS validate_coupon(TEXT, UUID, NUMERIC, TEXT);

CREATE OR REPLACE FUNCTION validate_coupon(
    p_code TEXT,
    p_user_id UUID,
    p_amount NUMERIC,
    p_account_type TEXT
)
RETURNS TABLE (
    is_valid BOOLEAN,
    discount_amount NUMERIC,
    affiliate_id UUID,
    commission_rate NUMERIC,
    message TEXT
) AS $$
DECLARE
    v_coupon RECORD;
    v_user_usage_count INTEGER;
    v_total_usage_count INTEGER;
    v_discount NUMERIC;
BEGIN
    -- Use LOWER() for case-insensitive matching
    SELECT * INTO v_coupon
    FROM public.discount_coupons
    WHERE LOWER(code) = LOWER(p_code);
    
    -- Check if exists
    IF v_coupon.id IS NULL THEN
        RETURN QUERY SELECT false, 0::NUMERIC, NULL::UUID, NULL::NUMERIC, 'Invalid coupon code';
        RETURN;
    END IF;
    
    -- Check if active
    IF NOT v_coupon.is_active THEN
        RETURN QUERY SELECT false, 0::NUMERIC, NULL::UUID, NULL::NUMERIC, 'Coupon is inactive';
        RETURN;
    END IF;
    
    -- Check validity period
    IF v_coupon.valid_from > NOW() THEN
        RETURN QUERY SELECT false, 0::NUMERIC, NULL::UUID, NULL::NUMERIC, 'Coupon not yet valid';
        RETURN;
    END IF;
    
    IF v_coupon.valid_until IS NOT NULL AND v_coupon.valid_until < NOW() THEN
        RETURN QUERY SELECT false, 0::NUMERIC, NULL::UUID, NULL::NUMERIC, 'Coupon has expired';
        RETURN;
    END IF;
    
    -- Check max uses (calculate total usage from coupon_usage table)
    IF v_coupon.max_uses IS NOT NULL THEN
        SELECT COUNT(*) INTO v_total_usage_count
        FROM public.coupon_usage
        WHERE coupon_id = v_coupon.id;
        
        IF v_total_usage_count >= v_coupon.max_uses THEN
            RETURN QUERY SELECT false, 0::NUMERIC, NULL::UUID, NULL::NUMERIC, 'Coupon usage limit reached';
            RETURN;
        END IF;
    END IF;
    
    -- Check user usage
    SELECT COUNT(*) INTO v_user_usage_count
    FROM public.coupon_usage
    WHERE coupon_id = v_coupon.id AND user_id = p_user_id;
    
    IF v_coupon.max_uses_per_user IS NOT NULL AND v_user_usage_count >= v_coupon.max_uses_per_user THEN
        RETURN QUERY SELECT false, 0::NUMERIC, NULL::UUID, NULL::NUMERIC, 'You have already used this coupon';
        RETURN;
    END IF;
    
    -- Check min purchase amount
    IF p_amount < v_coupon.min_purchase_amount THEN
        RETURN QUERY SELECT false, 0::NUMERIC, NULL::UUID, NULL::NUMERIC, 'Minimum purchase amount not met';
        RETURN;
    END IF;
    
    -- Check account type applicability
    IF v_coupon.account_types IS NOT NULL AND NOT (p_account_type = ANY(v_coupon.account_types)) THEN
        RETURN QUERY SELECT false, 0::NUMERIC, NULL::UUID, NULL::NUMERIC, 'Coupon not valid for this account type';
        RETURN;
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
    
    -- Return success
    RETURN QUERY SELECT true, v_discount, v_coupon.affiliate_id, v_coupon.commission_rate, 'Coupon valid'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
