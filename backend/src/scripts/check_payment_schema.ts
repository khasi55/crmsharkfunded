
import { supabase } from '../lib/supabase';

async function checkPaymentSchema() {
    const { data, error } = await supabase
        .from('payment_orders')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Payment Order Schema:', data ? Object.keys(data[0]) : 'No data');
        console.log('Sample Row:', data ? data[0] : 'No data');
    }
}

checkPaymentSchema();
