
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchCouponDetails() {
    const couponId = '8e6d11d8-a731-4b74-826f-4ddc3aa5c5ae';

    console.log(`Fetching details for coupon ID: ${couponId}...`);

    const { data: coupon, error } = await supabase
        .from('discount_coupons')
        .select('*')
        .eq('id', couponId)
        .single();

    if (error) {
        console.error('Error fetching coupon:', error);
        return;
    }

    if (!coupon) {
        console.log('Coupon not found!');
        return;
    }

    console.log('\n--- Coupon Details ---');
    console.log(`Code: ${coupon.code}`);
    console.log(`Description: ${coupon.description}`);
    console.log(`Discount: ${coupon.discount_value} (${coupon.discount_type})`);
    console.log(`Active: ${coupon.is_active}`);
    console.log(`Valid: ${coupon.valid_from} to ${coupon.valid_until}`);
    console.log('----------------------\n');
}

fetchCouponDetails();
