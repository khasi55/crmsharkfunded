-- Fix validate_coupon to be strictly case-insensitive
-- and ensure it returns all fields expected by the frontend/backend

CREATE OR REPLACE FUNCTION validate_coupon(
    p_code TEXT,
    p_user_id UUID,
    p_amount NUMERIC,
    p_account_type TEXT
)
RETURNS TABLE (
    is_valid BOOLEAN,
    discount_amount NUMERIC,
    error_message TEXT,
    coupon_id UUID,
    discount_type TEXT,
    affiliate_id UUID,
    commission_rate NUMERIC,
    discount_value NUMERIC -- Added this as coupons.ts uses it
) AS $func$
DECLARE
    v_coupon public.discount_coupons%ROWTYPE;
    v_user_usage_count INTEGER;
    v_discount NUMERIC;
BEGIN
    -- Fetch coupon (STRITCTLY case-insensitive)
    SELECT * INTO v_coupon
    FROM public.discount_coupons
    WHERE UPPER(code) = UPPER(p_code);
    
    -- Check if coupon exists
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 0::NUMERIC, 'Invalid coupon code'::TEXT, NULL::UUID, NULL::TEXT, NULL::UUID, NULL::NUMERIC, NULL::NUMERIC;
        RETURN;
    END IF;
    
    -- Check if active
    IF NOT v_coupon.is_active THEN
        RETURN QUERY SELECT false, 0::NUMERIC, 'Coupon is inactive'::TEXT, v_coupon.id, v_coupon.discount_type, v_coupon.affiliate_id, v_coupon.commission_rate, v_coupon.discount_value;
        RETURN;
    END IF;
    
    -- Check validity period
    IF v_coupon.valid_from > NOW() THEN
        RETURN QUERY SELECT false, 0::NUMERIC, 'Coupon not yet valid'::TEXT, v_coupon.id, v_coupon.discount_type, v_coupon.affiliate_id, v_coupon.commission_rate, v_coupon.discount_value;
        RETURN;
    END IF;
    
    IF v_coupon.valid_until IS NOT NULL AND v_coupon.valid_until < NOW() THEN
        RETURN QUERY SELECT false, 0::NUMERIC, 'Coupon has expired'::TEXT, v_coupon.id, v_coupon.discount_type, v_coupon.affiliate_id, v_coupon.commission_rate, v_coupon.discount_value;
        RETURN;
    END IF;
    
    -- Check max uses
    IF v_coupon.max_uses IS NOT NULL AND v_coupon.uses_count >= v_coupon.max_uses THEN
        RETURN QUERY SELECT false, 0::NUMERIC, 'Coupon usage limit reached'::TEXT, v_coupon.id, v_coupon.discount_type, v_coupon.affiliate_id, v_coupon.commission_rate, v_coupon.discount_value;
        RETURN;
    END IF;
    
    -- Check user usage
    -- (Assuming coupon_usage table exists and tracks user_id)
    SELECT COUNT(*) INTO v_user_usage_count
    FROM public.coupon_usage cu
    WHERE cu.coupon_id = v_coupon.id AND cu.user_id = p_user_id;
    
    IF v_coupon.max_uses_per_user IS NOT NULL AND v_user_usage_count >= v_coupon.max_uses_per_user THEN
        RETURN QUERY SELECT false, 0::NUMERIC, 'You have already used this coupon'::TEXT, v_coupon.id, v_coupon.discount_type, v_coupon.affiliate_id, v_coupon.commission_rate, v_coupon.discount_value;
        RETURN;
    END IF;
    
    -- Check min purchase amount
    IF p_amount < v_coupon.min_purchase_amount THEN
        RETURN QUERY SELECT false, 0::NUMERIC, 'Minimum purchase amount not met'::TEXT, v_coupon.id, v_coupon.discount_type, v_coupon.affiliate_id, v_coupon.commission_rate, v_coupon.discount_value;
        RETURN;
    END IF;
    
    -- Check account type applicability
    -- If account_types is NULL, it applies to all.
    -- If p_account_type is 'all', we skip this check (e.g. for general validation) 
    -- UNLESS the coupon is strictly restricted.
    -- For now, keep existing logic:
    IF v_coupon.account_types IS NOT NULL AND p_account_type != 'all' AND NOT (p_account_type = ANY(v_coupon.account_types)) THEN
        RETURN QUERY SELECT false, 0::NUMERIC, 'Coupon not valid for this account type'::TEXT, v_coupon.id, v_coupon.discount_type, v_coupon.affiliate_id, v_coupon.commission_rate, v_coupon.discount_value;
        RETURN;
    END IF;
    
    -- Calculate discount
    IF v_coupon.discount_type = 'percentage' THEN
        v_discount := p_amount * (v_coupon.discount_value / 100);
        -- Apply max discount cap if set
        IF v_coupon.max_discount_amount IS NOT NULL THEN
            v_discount := LEAST(v_discount, v_coupon.max_discount_amount);
        END IF;
    ELSIF v_coupon.discount_type = 'fixed' THEN
        v_discount := v_coupon.discount_value;
    ELSIF v_coupon.discount_type = 'bogo' THEN
        -- BOGO: Discount is 0 on the monetary amount, but sets a flag typically. 
        -- Ensuring we return 0 discount amount so it doesn't mess up payment totals.
        v_discount := 0; 
    ELSE
        v_discount := 0;
    END IF;
    
    -- Ensure discount doesn't exceed amount
    v_discount := LEAST(v_discount, p_amount);
    
    RETURN QUERY SELECT true, v_discount, NULL::TEXT, v_coupon.id, v_coupon.discount_type, v_coupon.affiliate_id, v_coupon.commission_rate, v_coupon.discount_value;
END;
$func$ LANGUAGE plpgsql;
