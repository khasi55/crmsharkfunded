import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCoupon() {
    const { data, error } = await supabase.rpc('validate_coupon', {
        p_code: 'SHARK30',
        p_user_id: '00000000-0000-0000-0000-000000000000',
        p_amount: 150,
        p_account_type: 'all'
    });
    console.log('RPC Result:', JSON.stringify(data, null, 2));
    if (error) console.error('Error:', error);
}
checkCoupon();
