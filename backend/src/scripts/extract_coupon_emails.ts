
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
    console.log("--- Coupon to Email Mapping ---");

    // Fetch all coupons with affiliate_id
    const { data: coupons, error: couponError } = await supabase
        .from('discount_coupons')
        .select('code, affiliate_id');

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

    console.log("Code | Email");
    console.log("-----|------");
    for (const c of coupons) {
        const email = c.affiliate_id ? emailMap.get(c.affiliate_id) || 'Unknown User' : 'No Affiliate Assigned';
        console.log(`${c.code} | ${email}`);
    }
}

extractMapping();
