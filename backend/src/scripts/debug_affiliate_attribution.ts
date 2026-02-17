import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugAffiliateSales(affiliateId: string) {
    console.log(`\n--- 🔍 Debugging Affiliate ID: ${affiliateId} ---`);

    // 1. Get Affiliate Profile
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', affiliateId).single();
    console.log('Affiliate Profile:', JSON.stringify(profile, null, 2));

    // 2. Get Direct Referrals (referred_by)
    const { data: directReferrals } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('referred_by', affiliateId);

    console.log(`Direct Referrals Count: ${directReferrals?.length || 0}`);
    const referralIds = directReferrals?.map(r => r.id) || [];

    // 3. Get Orders by Referral Code
    const { data: ordersByCode } = await supabase
        .from('payment_orders')
        .select('*')
        .ilike('coupon_code', profile?.referral_code || 'NONEXISTENT')
        .eq('status', 'paid');

    console.log(`Orders by Referral Code (${profile?.referral_code}): ${ordersByCode?.length || 0}`);

    // 4. Get Orders by Linked Coupons
    const { data: customCoupons } = await supabase
        .from('discount_coupons')
        .select('code')
        .eq('affiliate_id', affiliateId);

    const customCodes = customCoupons?.map(c => c.code) || [];
    console.log(`Custom Coupons: ${customCodes.join(', ')}`);

    if (customCodes.length > 0) {
        const { data: ordersByCustomCode } = await supabase
            .from('payment_orders')
            .select('*')
            .in('coupon_code', customCodes)
            .eq('status', 'paid');
        console.log(`Orders by Custom Codes: ${ordersByCustomCode?.length || 0}`);
    }

    // 5. Get Orders by Referred Users (even without coupon)
    if (referralIds.length > 0) {
        const { data: ordersByReferredUsers } = await supabase
            .from('payment_orders')
            .select('*')
            .in('user_id', referralIds)
            .eq('status', 'paid');
        console.log(`Orders by Referred Users (any coupon or none): ${ordersByReferredUsers?.length || 0}`);

        if (ordersByReferredUsers && ordersByReferredUsers.length > 0) {
            const total = ordersByReferredUsers.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
            console.log(`Total Sales Volume from Referred Users: $${total}`);
        }
    }
}

debugAffiliateSales('17df41f6-5067-4eb8-9f67-81dacf0af008'); // d3devansh12@gmail.com
