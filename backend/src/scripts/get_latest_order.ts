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

async function getLatestOrder() {
    const { data, error } = await supabase
        .from('payment_orders')
        .select('order_id, created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error('❌ Error fetching latest order:', error);
        return;
    }

    if (!data) {
        console.log('❌ No orders found.');
        return;
    }

    console.log(`Latest Order ID: ${data.order_id} (Created At: ${data.created_at})`);
}

getLatestOrder();
