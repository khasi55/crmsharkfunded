import { supabase } from '../lib/supabase';

async function verifyFix() {
    const orderId = 'SF-MANUAL-1771592141223';
    const { data, error } = await supabase
        .from('payment_orders')
        .select('*')
        .eq('order_id', orderId)
        .single();

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('ORDER_VERIFIED:', JSON.stringify(data, null, 2));
}

verifyFix();
