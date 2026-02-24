import { supabase } from '../lib/supabase';

async function checkRecentOrders() {
    const { data, error } = await supabase
        .from('payment_orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('RECENT_ORDERS:', JSON.stringify(data, null, 2));
}

checkRecentOrders();
