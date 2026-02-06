import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) throw new Error("Missing Supabase credentials");

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const code = 'BACCHA';

    // Check if coupon exists
    const { data: coupon, error } = await supabase
        .from('discount_coupons')
        .select('*')
        .eq('code', code)
        .maybeSingle();

    console.log('Coupon Data:', JSON.stringify(coupon, null, 2));
    console.log('Error:', error);

    if (!coupon) {
        console.log('\n❌ Coupon not found in database!');
        return;
    }

    // Test validation function
    console.log('\n📋 Testing validate_coupon function...');
    const { data: validation, error: validationError } = await supabase
        .rpc('validate_coupon', {
            p_code: code,
            p_user_id: '00000000-0000-0000-0000-000000000000', // dummy user
            p_amount: 100,
            p_account_type: 'standard'
        });

    console.log('Validation Result:', validation);
    console.log('Validation Error:', validationError);
}

check();
