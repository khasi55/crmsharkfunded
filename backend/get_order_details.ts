
import { supabase } from './src/lib/supabase';

async function getOrderDetails(orderId: string) {
    console.log(`\n--- Fetching details for Order: ${orderId} ---\n`);

    // 1. Search in payment_orders
    const { data: order, error: orderError } = await supabase
        .from('payment_orders')
        .select('*')
        .or(`order_id.eq.${orderId},transaction_id.eq.${orderId},payment_id.eq.${orderId}`)
        .single();

    if (orderError) {
        if (orderError.code === 'PGRST116') {
            console.log(`Order ${orderId} not found in payment_orders.`);
        } else {
            console.error('Error fetching order:', orderError);
        }
    } else {
        console.log('--- Payment Order Details ---');
        console.log(JSON.stringify(order, null, 2));
        console.log('\n');

        // 2. Search for related challenge if user_id or challenge_id exists
        if (order.user_id || order.challenge_id) {
            const { data: challenge } = await supabase
                .from('challenges')
                .select('*')
                .or(`user_id.eq.${order.user_id},id.eq.${order.challenge_id}`)
                .maybeSingle();

            if (challenge) {
                console.log('--- Related Challenge Details ---');
                console.log(JSON.stringify(challenge, null, 2));
                console.log('\n');
            }
        }

        // 3. Search for related profile
        if (order.user_id) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', order.user_id)
                .maybeSingle();

            if (profile) {
                console.log('--- User Profile Details ---');
                console.log(JSON.stringify(profile, null, 2));
                console.log('\n');
            }
        }
    }

    // 4. Broad search across other tables if not found as direct order_id
    if (!order) {
        console.log('Performing broad search in other tables...');
        const tables = ['challenges', 'trades', 'payouts'];
        for (const table of tables) {
            const { data, error } = await supabase
                .from(table)
                .select('*')
                .filter('metadata::text', 'ilike', `%${orderId}%`);

            if (data && data.length > 0) {
                console.log(`Found match in metadata of ${table}:`);
                console.log(JSON.stringify(data, null, 2));
            }
        }
    }
}

const targetOrderId = 'SF1771331163434DO8AX6XCC';
getOrderDetails(targetOrderId).catch(console.error);
