
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function debug() {
    const affiliateId = '04a05ed2-1e1d-45aa-86d2-d0572501e7ed';
    const referralCode = '7d23df0';

    console.log(`🔍 Debugging Affiliate: ${affiliateId} (Code: ${referralCode})`);

    // 1. Check direct referrals (referred_by)
    const { data: directRefs, error: dError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('referred_by', affiliateId);

    if (dError) console.error("Error fetching direct refs:", dError);
    console.log(`Direct Referrals (referred_by): ${directRefs?.length}`);
    if (directRefs?.length > 0) console.table(directRefs);

    // 2. Check coupon usage (payment_orders)
    const { data: couponRefs, error: cError } = await supabase
        .from('payment_orders')
        .select('user_id, coupon_code, status')
        .ilike('coupon_code', referralCode); // Case insensitive check

    if (cError) console.error("Error fetching coupon refs:", cError);
    console.log(`Coupon Referrals (Code: ${referralCode}): ${couponRefs?.length}`);
    if (couponRefs?.length > 0) console.table(couponRefs);

    // 3. Check if Affiliate exists in Profiles
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', affiliateId)
        .single();

    console.log("Profile Data:", {
        id: profile?.id,
        code: profile?.referral_code,
        referred_by: profile?.referred_by
    });
}

debug();
