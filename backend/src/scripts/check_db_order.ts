import { supabase } from '../lib/supabase';

async function checkOrder() {
    const orderId = 'SF1774129610450G5CTR6UOP';
    console.log(`Checking order ${orderId} in database...`);

    const { data, error } = await supabase
        .from('payment_orders')
        .select('*')
        .eq('order_id', orderId)
        .single();

    if (error) {
        console.error('Error fetching order:', error);
        return;
    }

    console.log('Order Data:', JSON.stringify(data, null, 2));
}

checkOrder();
