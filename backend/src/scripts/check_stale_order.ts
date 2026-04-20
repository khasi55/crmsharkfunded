import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSpecificOrder() {
    const orderId = 'SF17742195130478YPLDA9MC';
    console.log(`--- Checking Order: ${orderId} ---`);
    try {
        const { data: order, error } = await supabase
            .from('payment_orders')
            .select('*')
            .eq('order_id', orderId)
            .single();

        if (error) {
            console.error('Error fetching order:', error);
            return;
        }

        console.log('Order Details:', JSON.stringify(order, null, 2));
    } catch (e) {
        console.error('Unexpected error:', e);
    }
}

checkSpecificOrder();
