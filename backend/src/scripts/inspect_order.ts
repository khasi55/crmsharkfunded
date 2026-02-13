import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function inspectOrder() {
    const orderId = 'SF1771007932725PS9S5K2OW';
    console.log(`🔍 Inspecting order ${orderId}...`);

    const { data: order, error } = await supabase
        .from('payment_orders')
        .select('*')
        .eq('order_id', orderId)
        .single();

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Order Details:', JSON.stringify(order, null, 2));
}

inspectOrder();
