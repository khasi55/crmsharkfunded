import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testValidateCoupon() {
    console.log('--- Testing validate_coupon RPC ---');
    try {
        const { data: result, error } = await supabase.rpc('validate_coupon', {
            p_code: 'HOLI',
            p_user_id: '00000000-0000-0000-0000-000000000000',
            p_amount: 630,
            p_account_type: 'all'
        });

        if (error) {
            console.error('RPC Error:', error);
            return;
        }

        console.log('RPC Result:', JSON.stringify(result, null, 2));
    } catch (e) {
        console.error('Unexpected error:', e);
    }
}

testValidateCoupon();
