
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function check() {
    const orderId = 'SFORD177055825712486b414df';
    console.log(`Checking order: ${orderId}`);

    const { data: order, error } = await supabase
        .from('payment_orders')
        .select('*')
        .eq('order_id', orderId)
        .single();

    if (error) {
        console.error('Error fetching order:', error.message);
        return;
    }

    if (!order) {
        console.log('Order not found.');
        return;
    }

    console.log('Order Details:');
    console.log(`- Status: ${order.status}`);
    console.log(`- Is Account Created: ${order.is_account_created}`);
    console.log(`- Challenge ID: ${order.challenge_id}`);
    console.log(`- Created At: ${order.created_at}`);
    console.log(`- Paid At: ${order.paid_at}`);
}

check();
