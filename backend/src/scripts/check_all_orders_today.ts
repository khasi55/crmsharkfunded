import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function check() {
    console.log('Fetching all payment_orders from today (UTC)...');
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);

    const { data: orders, error } = await supabase
        .from('payment_orders')
        .select('*')
        .gte('created_at', startOfToday.toISOString())
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error:", error.message);
    } else {
        console.log(`Found ${orders.length} orders today.`);
        for (const order of orders) {
            console.log(`[${order.created_at}] ID: ${order.order_id}, Amount: ${order.amount}, Status: ${order.status}, Metadata: ${JSON.stringify(order.metadata)}`);
        }
    }
}
check();
