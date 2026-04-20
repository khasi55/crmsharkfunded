import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkHoliCoupon() {
    console.log('--- Checking HOLI Coupon Configuration ---');
    try {
        const { data: coupon, error } = await supabase
            .from('discount_coupons')
            .select('*')
            .ilike('code', 'HOLI')
            .single();

        if (error) {
            console.error('Error fetching HOLI coupon:', error);
            return;
        }

        console.log('Coupon Details:', JSON.stringify(coupon, null, 2));
    } catch (e) {
        console.error('Unexpected error:', e);
    }
}

checkHoliCoupon();
