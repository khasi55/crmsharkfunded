
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCoupons() {
    console.log("Checking coupons in 'discount_coupons' table...");
    const { data, error } = await supabase.from('discount_coupons').select('*');

    if (error) {
        console.error("Error fetching coupons:", error);
    } else {
        console.log("Found coupons:", data);

        if (data.length > 0) {
            const code = data[0].code;
            console.log(`\nTesting validation logic for code: ${code}`);

            // Replicate logic from coupons.ts
            const { data: coupon, error: couponError } = await supabase
                .from('discount_coupons')
                .select('*')
                .eq('code', code)
                .eq('is_active', true)
                .single();

            if (coupon) {
                console.log("Coupon found by query!", coupon);
            } else {
                console.log("Coupon NOT found by query (or inactive). Error:", couponError);
            }
        }
    }
}

checkCoupons();
