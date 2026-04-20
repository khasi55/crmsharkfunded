import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debug() {
    const orderId = 'SF17742098896703U5P77JSB';
    const email = 'vivekmishragta@gmail.com';

    console.log(`Searching for Order ID: ${orderId}...`);
    const { data: order, error: orderError } = await supabase
        .from('payment_orders')
        .select('*')
        .eq('order_id', orderId)
        .single();

    if (orderError) {
        console.error('Order query error:', orderError.message);
    }

    if (order) {
        console.log('Order found:');
        console.log(JSON.stringify(order, null, 2));
    } else {
        console.log('Order not found in payment_orders');
    }

    console.log(`\nSearching for user: ${email}...`);
    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .ilike('email', email);

    if (profileError) {
        console.error('Profile query error:', profileError.message);
    }

    if (profiles && profiles.length > 0) {
        console.log(`Found ${profiles.length} profile(s):`);
        console.log(JSON.stringify(profiles, null, 2));

        const userId = profiles[0].id;
        console.log(`\nSearching for all orders for user ID: ${userId}...`);
        const { data: userOrders, error: userOrdersError } = await supabase
            .from('payment_orders')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (userOrdersError) {
            console.error('User orders query error:', userOrdersError.message);
        }

        if (userOrders && userOrders.length > 0) {
            console.log(`Found ${userOrders.length} order(s) for this user:`);
            userOrders.forEach(o => {
                console.log(`- ${o.order_id}: ${o.amount} ${o.currency} (${o.status}) - ${o.created_at}`);
            });
        }
    } else {
        console.log('User profile not found');
    }
}

debug();
