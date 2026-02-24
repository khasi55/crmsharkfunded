
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function reproduce() {
    const orderId = `DEBUG-${Date.now()}`;
    console.log(`Attempting to insert order ${orderId}...`);

    const { error: dbError } = await supabase.from('payment_orders').insert({
        user_id: null,
        order_id: orderId,
        amount: 10,
        currency: 'USD',
        status: 'pending',
        account_type_name: 'Debug Test',
        account_type_id: null, // Testing if this is the issue
        account_size: 1000,
        platform: 'MT5',
        model: 'lite',
        payment_gateway: 'debug',
        payment_id: 'debug_pay_id',
        coupon_code: null,
        metadata: {
            debug: true,
            customerName: 'Debug User',
            customerEmail: 'debug@example.com'
        }
    });

    if (dbError) {
        console.error('❌ Database insertion failed:', dbError);
        console.error('Error Code:', dbError.code);
        console.error('Error Detail:', dbError.details);
        console.error('Error Hint:', dbError.hint);
    } else {
        console.log('✅ Insertion successful!');

        // Cleanup
        await supabase.from('payment_orders').delete().eq('order_id', orderId);
    }
}

reproduce();
