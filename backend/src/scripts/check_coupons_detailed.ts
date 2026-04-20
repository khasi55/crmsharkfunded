import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function check() {
    console.log('Checking for coupon "utsab"...');
    const { data: coupon, error } = await supabase
        .from('discount_coupons')
        .select('*')
        .ilike('code', 'utsab')
        .maybeSingle();

    if (error) {
        console.error("Error:", error.message);
    } else if (coupon) {
        console.log("Coupon Found:", JSON.stringify(coupon, null, 2));
    } else {
        console.log("Coupon 'utsab' not found. Checking for any coupons with high discounts...");
        const { data: coupons } = await supabase
            .from('discount_coupons')
            .select('*')
            .gte('discount_value', 90);
        console.log("High Discount Coupons:", JSON.stringify(coupons, null, 2));
    }
}
check();
