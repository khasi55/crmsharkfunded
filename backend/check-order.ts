import * as dotenv from 'dotenv';
dotenv.config();
import { supabase } from './src/lib/supabase';

async function checkOrder(orderId: string) {
    const { data: globalOrder, error } = await supabase.from('payment_orders').select('*').eq('order_id', orderId);
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Order Details:', globalOrder);
    }
}

checkOrder('SF17717469945909V0XUG8P6').then(() => {
    console.log("Done.");
    process.exit(0);
});
