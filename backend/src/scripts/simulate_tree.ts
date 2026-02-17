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

async function simulateTreeFor(search: string) {
    // 1. Fetch profiles
    const { data: affiliates } = await supabase
        .from('profiles')
        .select('id, email, full_name, referral_code, created_at')
        .or(`full_name.ilike.%${search}%,email.ilike.%${search}%,referral_code.ilike.%${search}%`);

    if (!affiliates || affiliates.length === 0) {
        console.log('No affiliates found.');
        return;
    }

    const affiliateIds = affiliates.map(a => a.id);

    // 2. Map codes
    const { data: customCoupons } = await supabase
        .from('discount_coupons')
        .select('code, affiliate_id')
        .in('affiliate_id', affiliateIds);

    const affiliateCodeMap = new Map<string, string>();
    affiliates.forEach(a => {
        if (a.referral_code) affiliateCodeMap.set(a.referral_code.toLowerCase(), a.id);
    });
    customCoupons?.forEach(c => {
        if (c.code && c.affiliate_id) affiliateCodeMap.set(c.code.toLowerCase(), c.affiliate_id);
    });

    const allAffiliateCodesRaw = Array.from(affiliateCodeMap.keys());
    const allAffiliateCodes = [...new Set([
        ...allAffiliateCodesRaw,
        ...allAffiliateCodesRaw.map(c => c.toLowerCase()),
        ...allAffiliateCodesRaw.map(c => c.toUpperCase()),
        ...allAffiliateCodesRaw.map(c => c.charAt(0).toUpperCase() + c.slice(1).toLowerCase())
    ])];

    // --- NEW LOGIC: Direct Referrals ---
    const { data: referredUsers } = await supabase
        .from('profiles')
        .select('id, referred_by')
        .in('referred_by', affiliateIds);

    const referredUserIds = referredUsers?.map(u => u.id) || [];
    const userToReferrerMap = new Map<string, string>();
    referredUsers?.forEach(u => userToReferrerMap.set(u.id, u.referred_by!));

    // 3. Fetch sales
    const orQuery = [];
    if (allAffiliateCodes.length > 0) orQuery.push(`coupon_code.in.(${allAffiliateCodes.join(',')})`);
    if (referredUserIds.length > 0) orQuery.push(`user_id.in.(${referredUserIds.join(',')})`);

    const query = supabase
        .from('payment_orders')
        .select('amount, coupon_code, user_id')
        .eq('status', 'paid');

    if (orQuery.length > 0) {
        query.or(orQuery.join(','));
    } else {
        console.log('No codes or referrals to search for.');
        return;
    }

    const { data: orders } = await query;

    const salesStatsMap = new Map<string, { volume: number, count: number }>();
    orders?.forEach(o => {
        let attributedAffId: string | undefined;

        if (o.coupon_code) {
            attributedAffId = affiliateCodeMap.get(o.coupon_code.toLowerCase());
        }

        if (!attributedAffId && o.user_id) {
            attributedAffId = userToReferrerMap.get(o.user_id);
        }

        if (attributedAffId) {
            const stats = salesStatsMap.get(attributedAffId) || { volume: 0, count: 0 };
            stats.volume += Number(o.amount) || 0;
            stats.count += 1;
            salesStatsMap.set(attributedAffId, stats);
        }
    });

    console.log('--- Tree Simulation Results (Robust) ---');
    affiliates.forEach(a => {
        const stats = salesStatsMap.get(a.id) || { volume: 0, count: 0 };
        console.log(`Affiliate: ${a.email}`);
        console.log(`  Referral Code: ${a.referral_code}`);
        console.log(`  Sales Count: ${stats.count}`);
        console.log(`  Revenue: $${stats.volume.toFixed(2)}`);
    });
}

simulateTreeFor('39d45a8'); // aaditkohli1 referral code
