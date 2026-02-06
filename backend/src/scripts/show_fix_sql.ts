import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) throw new Error("Missing Supabase credentials");

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixValidateCoupon() {
    console.log('🔧 Fixing validate_coupon function...\n');

    // Drop the old function
    console.log('1. Dropping old function...');
    const dropSQL = `DROP FUNCTION IF EXISTS validate_coupon(TEXT, UUID, NUMERIC, TEXT);`;

    try {
        await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
            method: 'POST',
            headers: {
                'apikey': supabaseKey || '',
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json'
            } as Record<string, string>,
            body: JSON.stringify({ query: dropSQL })
        });
    } catch (e) {
        // Might not work, that's ok
    }

    // Create the new function
    console.log('2. Creating new function...');
    const createSQL = `
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
    SELECT * INTO v_coupon FROM public.discount_coupons WHERE code = p_code;
    
    IF v_coupon.id IS NULL THEN
        RETURN QUERY SELECT false, 0::NUMERIC, NULL::UUID, NULL::NUMERIC, 'Invalid or expired coupon code'::TEXT;
        RETURN;
    END IF;
    
    IF NOT v_coupon.is_active THEN
        RETURN QUERY SELECT false, 0::NUMERIC, NULL::UUID, NULL::NUMERIC, 'Coupon is inactive'::TEXT;
        RETURN;
    END IF;
    
    IF v_coupon.valid_from > NOW() THEN
        RETURN QUERY SELECT false, 0::NUMERIC, NULL::UUID, NULL::NUMERIC, 'Coupon not yet valid'::TEXT;
        RETURN;
    END IF;
    
    IF v_coupon.valid_until IS NOT NULL AND v_coupon.valid_until < NOW() THEN
        RETURN QUERY SELECT false, 0::NUMERIC, NULL::UUID, NULL::NUMERIC, 'Coupon has expired'::TEXT;
        RETURN;
    END IF;
    
    IF v_coupon.max_uses IS NOT NULL THEN
        SELECT COALESCE(COUNT(*), 0) INTO v_total_usage_count
        FROM public.coupon_usage WHERE coupon_id = v_coupon.id;
        
        IF v_total_usage_count >= v_coupon.max_uses THEN
            RETURN QUERY SELECT false, 0::NUMERIC, NULL::UUID, NULL::NUMERIC, 'Coupon usage limit reached'::TEXT;
            RETURN;
        END IF;
    END IF;
    
    SELECT COALESCE(COUNT(*), 0) INTO v_user_usage_count
    FROM public.coupon_usage WHERE coupon_id = v_coupon.id AND user_id = p_user_id;
    
    IF v_coupon.max_uses_per_user IS NOT NULL AND v_user_usage_count >= v_coupon.max_uses_per_user THEN
        RETURN QUERY SELECT false, 0::NUMERIC, NULL::UUID, NULL::NUMERIC, 'You have already used this coupon'::TEXT;
        RETURN;
    END IF;
    
    IF p_amount < v_coupon.min_purchase_amount THEN
        RETURN QUERY SELECT false, 0::NUMERIC, NULL::UUID, NULL::NUMERIC, 'Minimum purchase amount not met'::TEXT;
        RETURN;
    END IF;
    
    IF v_coupon.account_types IS NOT NULL AND NOT (p_account_type = ANY(v_coupon.account_types)) THEN
        RETURN QUERY SELECT false, 0::NUMERIC, NULL::UUID, NULL::NUMERIC, 'Coupon not valid for this account type'::TEXT;
        RETURN;
    END IF;
    
    IF v_coupon.discount_type = 'percentage' THEN
        v_discount := p_amount * (v_coupon.discount_value / 100);
        IF v_coupon.max_discount_amount IS NOT NULL THEN
            v_discount := LEAST(v_discount, v_coupon.max_discount_amount);
        END IF;
    ELSE
        v_discount := v_coupon.discount_value;
    END IF;
    
    RETURN QUERY SELECT true, v_discount, v_coupon.affiliate_id, v_coupon.commission_rate, 'Coupon valid'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`;

    console.log('\n📝 Please run this SQL manually in Supabase SQL Editor:');
    console.log('=' + '='.repeat(80));
    console.log(createSQL);
    console.log('=' + '='.repeat(80));
    console.log('\n✅ After running the SQL, test the coupon "Baccha" again in the checkout form.');
}

fixValidateCoupon();
