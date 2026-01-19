import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase URL or Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCoupon() {
    console.log('🔍 Testing Coupon Validation...');

    const TEST_COUPON = 'WELCOME10'; // Change if needed
    const TEST_USER_ID = 'c7c8bdcb-134a-40ac-9caf-702bc4b50171'; // Use a valid user ID from your logs
    const TEST_AMOUNT = 100;
    const TEST_ACCOUNT_TYPE = '1 Step'; // Test exact string match

    console.log(`Checking Coupon: ${TEST_COUPON} for Account Type: "${TEST_ACCOUNT_TYPE}"`);

    const { data, error } = await supabase
        .rpc('validate_coupon', {
            p_code: TEST_COUPON,
            p_user_id: TEST_USER_ID,
            p_amount: TEST_AMOUNT,
            p_account_type: TEST_ACCOUNT_TYPE,
        });

    if (error) {
        console.error('❌ RPC Error:', error);
    } else {
        console.log('✅ RPC Result:', data);
    }
}

testCoupon();
