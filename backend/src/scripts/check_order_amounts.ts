import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOrders() {
    const orderIds = ['SF1772445045722Y8PZTVX7L', 'SF1772443553508N6YQN0LGR'];

    console.log("Fetching from payment_orders table...");
    const { data: payments, error: paymentsError } = await supabase
        .from('payment_orders')
        .select('*')
        .in('order_id', orderIds);

    if (paymentsError) {
        console.error("Error fetching payments:", paymentsError);
    } else {
        console.log("Payments:", JSON.stringify(payments, null, 2));
    }

    console.log("Fetching from orders table...");
    const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .in('id', orderIds);

    if (ordersError) {
        console.error("Error fetching orders:", ordersError);
    } else {
        console.log("Orders:", JSON.stringify(orders, null, 2));
    }
}

checkOrders().catch(console.error);
