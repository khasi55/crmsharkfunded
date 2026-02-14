-- Add 'bogo' to discount_type check constraint
-- modifying the check constraint on discount_coupons table

DO $$
BEGIN
    -- Drop existing check constraint if it exists (to be safe/clean)
    ALTER TABLE public.discount_coupons DROP CONSTRAINT IF EXISTS discount_coupons_discount_type_check;
    
    -- Add new check constraint including 'bogo'
    ALTER TABLE public.discount_coupons 
    ADD CONSTRAINT discount_coupons_discount_type_check 
    CHECK (discount_type IN ('percentage', 'fixed', 'bogo'));
    
    -- Drop existing function to allow changing return columns
    DROP FUNCTION IF EXISTS public.validate_coupon(text, uuid, numeric, text);

    -- Update validate_coupon function to handle bogo
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
        discount_value NUMERIC
    ) AS $func$
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
        SELECT COUNT(*) INTO v_user_usage_count
        FROM public.coupon_usage
        WHERE coupon_id = v_coupon.id AND user_id = p_user_id;
        
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
        IF v_coupon.account_types IS NOT NULL AND NOT (p_account_type = ANY(v_coupon.account_types)) THEN
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
            -- BOGO: Buy One Get One. The current item is paid for fully (discount = 0),
            -- but the system will provision a second one for free.
            v_discount := 0; 
        ELSE
            v_discount := 0;
        END IF;
        
        -- Ensure discount doesn't exceed amount
        v_discount := LEAST(v_discount, p_amount);
        
        RETURN QUERY SELECT true, v_discount, NULL::TEXT, v_coupon.id, v_coupon.discount_type, v_coupon.affiliate_id, v_coupon.commission_rate, v_coupon.discount_value;
    END;
    $func$ LANGUAGE plpgsql;

    RAISE NOTICE '✅ Discount coupons constraint updated and validate_coupon function replaced!';
END $$;
