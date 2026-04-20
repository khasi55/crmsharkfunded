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

async function debug() {
    const { data: order } = await supabase.from('payment_orders').select('*').eq('order_id', 'SF177228340580045UYBMJ98').single();
    if (order) {
        console.log('Order:');
        console.log(JSON.stringify(order, null, 2));
    } else {
        console.log('Order not found!');
    }
}
debug();
