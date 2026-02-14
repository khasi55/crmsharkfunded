import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCoupon() {
    const { data, error } = await supabase
        .from('discount_coupons')
        .select('*')
        .ilike('code', 'single')
        .single();

    if (error) {
        console.error('Error fetching coupon:', error.message);
        return;
    }

    console.log('Coupon "single" details:', data);
}

checkCoupon();
