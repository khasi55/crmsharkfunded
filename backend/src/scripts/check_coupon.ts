
import { supabase } from '../lib/supabase';

async function checkCouponUsage() {
    const email = 'siddareddy1947@gmail.com';
    const coupon = 'instant';

    console.log(`🔍 Checking data for user: ${email} and coupon: ${coupon}`);

    // 1. Find the user ID
    const { data: userProfile, error: userError } = await supabase
        .from('profiles')
        .select('id, email, full_name, referred_by')
        .eq('email', email)
        .single();

    if (userError) {
        console.error('❌ User profile not found:', userError.message);
    } else {
        console.log('✅ User Found:', userProfile);
    }

    // 2. Find the affiliate who owns the code 'instant'
    const { data: affiliate, error: affError } = await supabase
        .from('profiles')
        .select('id, email, full_name, referral_code')
        .ilike('referral_code', coupon) // Case insensitive check
        .single();

    if (affError) {
        console.log(`ℹ️ No affiliate profile found with code '${coupon}'. It might be a system coupon, not an affiliate code.`);
    } else {
        console.log('✅ Affiliate Found:', affiliate);
    }

    // 3. Check Payment Orders
    if (userProfile) {
        const { data: orders, error: orderError } = await supabase
            .from('payment_orders')
            .select('*')
            .eq('user_id', userProfile.id)
            .ilike('coupon_code', coupon);

        if (orderError) {
            console.error('❌ Error fetching orders:', orderError.message);
        } else {
            console.log(`✅ Found ${orders.length} orders for this user with coupon '${coupon}':`);
            orders.forEach(o => {
                console.log(`   - Order ${o.id}: Status=${o.status}, Amount=${o.amount}, Created=${o.created_at}`);
            });
        }
    }
    // 4. Check System Coupons table (discount_coupons)
    const { data: couponData, error: couponError } = await supabase
        .from('discount_coupons')
        .select('*')
        .ilike('code', coupon)
        .single();

    if (couponError) {
        console.log(`ℹ️ No system coupon found in discount_coupons with code '${coupon}'.`);
    } else {
        console.log('✅ Discount Coupon Found:', couponData);
    }
}

checkCouponUsage();
