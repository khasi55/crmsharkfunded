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

async function checkDiscountCoupon(code: string) {
    console.log(`🔍 Checking discount_coupons: ${code}...`);
    const { data, error } = await supabase
        .from('discount_coupons')
        .select('*')
        .ilike('code', code.trim());

    if (error) {
        console.error('❌ Error fetching coupon:', error);
        return;
    }

    if (!data || data.length === 0) {
        console.log('❌ Coupon not found in discount_coupons.');
        return;
    }

    console.log('Coupon Details:', JSON.stringify(data, null, 2));
}

checkDiscountCoupon('single');
