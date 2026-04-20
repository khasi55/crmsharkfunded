
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOrders() {
    console.log('Checking recent payment orders for Bolt challenges...');
    const { data: orders, error } = await supabase
        .from('payment_orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Error fetching orders:', error);
        return;
    }

    orders.forEach(order => {
        const metadata = order.metadata || {};
        console.log(`Order ID: ${order.order_id}`);
        console.log(`Model: ${metadata.model}`);
        console.log(`MT5 Group: ${metadata.mt5_group}`);
        console.log(`Status: ${order.status}`);
        console.log('---');
    });
}

checkOrders();
