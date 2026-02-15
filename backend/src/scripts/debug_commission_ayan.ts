
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function debugCommission() {
    const email = 'tayan9322@gmail.com';
    const coupon = 'GTGANG';

    console.log(`🔍 Investigating commission for ${email} with coupon ${coupon}...`);

    // 1. Find User Profile
    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email);

    if (profileError) {
        console.error('❌ Error fetching profile:', profileError);
        return;
    }

    if (!profiles || profiles.length === 0) {
        console.log('❓ No profile found for this email.');
    } else {
        console.log('✅ Profile found:', profiles[0]);
    }

    // 2. Find Payment Orders
    const { data: orders, error: orderError } = await supabase
        .from('payment_orders')
        .select('*')
        .eq('user_email', email);

    if (orderError) {
        console.error('❌ Error fetching orders:', orderError);
        return;
    }

    console.log(`✅ Found ${orders?.length || 0} orders for this email.`);
    orders?.forEach(order => {
        console.log(`- Order: ID=${order.id}, Status=${order.status}, Amount=${order.amount}, Coupon=${order.coupon_code || order.metadata?.coupon_code}, ReferredBy=${order.referred_by || order.metadata?.referred_by}`);
    });

    // 3. Find Commissions
    const { data: commissions, error: commError } = await supabase
        .from('commissions')
        .select('*')
        .or(`user_id.eq.${profiles?.[0]?.id},referred_user_email.eq.${email}`);

    if (commError) {
        console.error('❌ Error fetching commissions:', commError);
    } else {
        console.log(`✅ Found ${commissions?.length || 0} commissions related to this user/email.`);
        commissions?.forEach(comm => {
            console.log(`- Commission: ID=${comm.id}, Status=${comm.status}, Amount=${comm.amount}, OrderID=${comm.order_id}`);
        });
    }

    // 4. Check Coupon Details
    const { data: coupons, error: couponError } = await supabase
        .from('discount_coupons')
        .select('*')
        .eq('code', coupon);

    if (couponError) {
        console.error('❌ Error fetching coupon:', couponError);
    } else {
        console.log(`✅ Coupon details for ${coupon}:`, coupons?.[0]);
    }
}

debugCommission().catch(console.error);
