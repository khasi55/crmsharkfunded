import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOrder(orderId: string) {
    console.log(`🔍 Checking Order: ${orderId}...`);

    // Join with account_types to get group
    const { data, error } = await supabase
        .from('payment_orders')
        .select(`
            *,
            account_types (*)
        `)
        .eq('order_id', orderId)
        .maybeSingle();

    if (error) {
        console.error('❌ Error fetching order:', error);
        return;
    }

    if (!data) {
        console.log('❌ Order not found in DB.');
        return;
    }

    console.log('Order Details:', JSON.stringify(data, null, 2));
}

const TARGET_ORDER = 'SF1771007932725PS9S5K2OW';
checkOrder(TARGET_ORDER);
