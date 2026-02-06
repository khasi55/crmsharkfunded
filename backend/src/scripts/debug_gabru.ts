
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve } from 'path';

// Load env
dotenv.config({ path: resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) throw new Error("Missing Supabase credentials");

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const code = 'GABRU30';
    const { data: coupon, error } = await supabase
        .from('discount_coupons')
        .select('*, affiliate:profiles(id, email)')
        .eq('code', code)
        .single();

    console.log('Coupon Data:', coupon);
    console.log('Error:', error);

    if (coupon?.affiliate_id) {
        // Check profile directly
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', coupon.affiliate_id);
        console.log('Profile Data:', profile);
    }
}

check();
