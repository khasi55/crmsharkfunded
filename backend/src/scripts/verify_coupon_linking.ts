
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function verify() {
    console.log("🕵️ Verifying Coupon Linking...");

    // 1. Find a Used Coupon that belongs to an Affiliate
    const { data: orders } = await supabase
        .from('payment_orders')
        .select('user_id, coupon_code')
        .not('coupon_code', 'is', null)
        .limit(50);

    if (!orders || orders.length === 0) {
        console.log("No orders with coupons found.");
        return;
    }

    let targetCase: { code: string, affiliateId: string, referalUserId: string } | null = null;

    for (const o of orders) {
        const code = o.coupon_code.toLowerCase();
        // Check if this code belongs to a profile
        const { data: affiliate } = await supabase
            .from('profiles')
            .select('id, referral_code')
            .ilike('referral_code', code) // Case insensitive match
            .single();

        if (affiliate) {
            console.log(`Match Found! User ${o.user_id} used code '${o.coupon_code}' owned by Affiliate ${affiliate.id}`);
            targetCase = { code: o.coupon_code, affiliateId: affiliate.id, referalUserId: o.user_id };
            break;
        }
    }

    if (!targetCase) {
        console.log("No orders found where the coupon code belongs to a known affiliate profile.");
        return;
    }

    // 2. Fetch the Tree (Simulate API call or Logic)
    // We will just invoke the logic purely here to see if it produces the link.
    // ... Copying simplified logic from router ...

    console.log(`Checking linkage for Affiliate ${targetCase.affiliateId} -> User ${targetCase.referalUserId}`);
    // Check if they are linked via direct DB referred_by
    const { data: userProfile } = await supabase.from('profiles').select('referred_by').eq('id', targetCase.referalUserId).single();
    if (userProfile?.referred_by === targetCase.affiliateId) {
        console.log("⚠️ User is ALREADY linked via database `referred_by`. This test confirms standard linking, but not the new coupon logic specifically (unless we clear it).");
    } else {
        console.log("✅ User is NOT linked via `referred_by`. If they appear in the tree, it's due to the COUPON logic.");
    }

}

verify();
