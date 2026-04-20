import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugOrder() {
    const orderId = 'TEST_VERIFY_1772292100900';
    const couponCode = 'SHARK30';

    console.log(`--- Fetching Order: ${orderId} ---`);
    const { data: order, error: orderError } = await supabase
        .from('payment_orders')
        .select('*')
        .eq('order_id', orderId)
        .single();

    if (orderError) {
        console.error('Error fetching order:', orderError);
    } else {
        console.log(JSON.stringify(order, null, 2));
    }

    console.log(`\n--- Fetching Coupon: ${couponCode} ---`);
    const { data: coupons, error: couponError } = await supabase
        .from('discount_coupons')
        .select('*')
        .ilike('code', couponCode);

    if (couponError) {
        console.error('Error fetching coupon:', couponError);
    } else {
        console.log(JSON.stringify(coupons, null, 2));
    }

    console.log(`\n--- Fetching Account Type: 2 ---`);
    const { data: accountType, error: atError } = await supabase
        .from('account_types')
        .select('*')
        .eq('id', 2)
        .single();

    if (atError) {
        console.error('Error fetching account type:', atError);
    } else {
        console.log(JSON.stringify(accountType, null, 2));
    }

    console.log(`\n--- Fetching Pricing Configurations ---`);
    const { data: pricing, error: pricingError } = await supabase
        .from('pricing_configurations')
        .select('*');

    if (pricingError) {
        console.error('Error fetching pricing:', pricingError);
    } else {
        console.log(JSON.stringify(pricing, null, 2));
    }

    console.log(`\n--- Fetching Audit Logs for Coupons ---`);
    const { data: logs, error: logsError } = await supabase
        .from('system_logs')
        .select('*')
        .or('message.ilike.%coupon%,details->>action_type.ilike.%coupon%,message.ilike.%discount%,details->>action_type.ilike.%discount%')
        .order('created_at', { ascending: false })
        .limit(20);

    if (logsError) {
        console.error('Error fetching logs:', logsError);
    } else {
        console.log(JSON.stringify(logs, null, 2));
    }
}

debugOrder();
