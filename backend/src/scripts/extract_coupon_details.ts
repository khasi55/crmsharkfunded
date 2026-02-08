
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing environment variables");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function extractMapping() {
    console.log("--- Detailed Coupon Mapping ---");

    // Fetch all coupons
    const { data: coupons, error: couponError } = await supabase
        .from('discount_coupons')
        .select('code, affiliate_id, discount_value, commission_rate');

    if (couponError) {
        console.error("Error fetching coupons:", couponError.message);
        return;
    }

    // Collect all affiliate IDs
    const affiliateIds = [...new Set(coupons.filter(c => c.affiliate_id).map(c => c.affiliate_id))];

    // Fetch profiles for these affiliates
    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', affiliateIds);

    if (profileError) {
        console.error("Error fetching profiles:", profileError.message);
        return;
    }

    const emailMap = new Map(profiles.map(p => [p.id, p.email]));

    process.stdout.write("Code | Discount | Commission | Email\n");
    process.stdout.write("-----|----------|------------|-------\n");
    for (const c of coupons) {
        const email = c.affiliate_id ? emailMap.get(c.affiliate_id) || 'Unknown User' : 'No Affiliate Assigned';
        const discount = c.discount_value || '0';
        const commission = c.commission_rate || '0';
        console.log(`${c.code.padEnd(15)} | ${String(discount).padEnd(8)} | ${String(commission).padEnd(10)} | ${email}`);
    }
}

extractMapping();
