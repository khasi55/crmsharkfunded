import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function check() {
    console.log('Fetching details for Suspicious Orders...');
    const orderIds = ['SF1772445045722Y8PZTVX7L', 'SF1772443553508N6YQN0LGR'];

    const { data: orders, error } = await supabase
        .from('payment_orders')
        .select('*')
        .in('order_id', orderIds);

    if (error) {
        console.error("Error:", error.message);
    } else {
        console.log("Orders:", JSON.stringify(orders, null, 2));
    }
}
check();
