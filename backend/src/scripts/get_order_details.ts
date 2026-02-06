
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const orderId = 'SF-ORDER-1770203368464-d4a366e1';
    console.log(`Fetching order: ${orderId}`);

    const { data: order, error } = await supabase
        .from('payment_orders')
        .select('*')
        .eq('order_id', orderId)
        .single();

    if (order) {
        const { data: profile } = await supabase.from('profiles').select('full_name, email').eq('id', order.user_id).single();
        console.log("Profile:", profile);
    }

    if (error) {
        console.error("Error fetching order:", error);
        return;
    }

    console.log("Order Details:");
    console.log(JSON.stringify(order, null, 2));
}

main();
