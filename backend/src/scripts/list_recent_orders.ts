import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function check() {
    const today = new Date().toISOString().split('T')[0];
    console.log(`Fetching orders from ${today}...`);
    const { data, error } = await supabase
        .from('payment_orders')
        .select('*')
        .gte('created_at', today)
        .order('created_at', { ascending: false });
    if (error) {
        console.error("Error fetching orders:", error);
    } else {
        console.log(`Found ${data.length} orders today.`);
        data.forEach(order => {
            console.log(`Order [${order.order_id}] | ${order.amount} ${order.currency} | ${order.account_type_name} | ${order.payment_gateway} | Status: ${order.status} | Created: ${order.created_at}`);
        });
    }
}
check();
