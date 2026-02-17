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

async function debugCoupons(codes: string[]) {
    for (const code of codes) {
        console.log(`\n--- 🔍 Debugging Code: ${code} ---`);

        // 1. Check discount_coupons
        const { data: discountCoupons, error: dcError } = await supabase
            .from('discount_coupons')
            .select(`
                *,
                profiles:affiliate_id (id, email, full_name)
            `)
            .ilike('code', code);

        if (dcError) console.error('❌ Error in discount_coupons:', dcError);
        else console.log('✅ Matches in discount_coupons:', JSON.stringify(discountCoupons, null, 2));

        // 2. Check profiles for referral_code
        const { data: profileReferrals, error: prError } = await supabase
            .from('profiles')
            .select('id, email, full_name, referral_code')
            .ilike('referral_code', code);

        if (prError) console.error('❌ Error in profiles:', prError);
        else console.log('✅ Matches in profiles (referral_code):', JSON.stringify(profileReferrals, null, 2));
    }
}

const codesToDebug = process.argv.slice(2);
if (codesToDebug.length === 0) {
    debugCoupons(['NEW40', 'SHARK30', 'SHARK40']);
} else {
    debugCoupons(codesToDebug);
}
