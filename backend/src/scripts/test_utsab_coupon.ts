import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function check() {
    console.log('Testing validate_coupon RPC with code "utsab"...');
    const { data, error } = await supabase.rpc('validate_coupon', {
        p_code: 'utsab',
        p_user_id: '00000000-0000-0000-0000-000000000000',
        p_amount: 799,
        p_account_type: 'all'
    });

    if (error) {
        console.error("RPC Error:", error.message);
    } else {
        console.log("RPC Data:", JSON.stringify(data, null, 2));
    }

    console.log('\nTesting with code "UTSAB"...');
    const { data: dataUpper, error: errorUpper } = await supabase.rpc('validate_coupon', {
        p_code: 'UTSAB',
        p_user_id: '00000000-0000-0000-0000-000000000000',
        p_amount: 799,
        p_account_type: 'all'
    });

    if (errorUpper) {
        console.error("RPC Error (Upper):", errorUpper.message);
    } else {
        console.log("RPC Data (Upper):", JSON.stringify(dataUpper, null, 2));
    }
}
check();
