import * as dotenv from 'dotenv';
dotenv.config();

import { supabase } from './src/lib/supabase';

async function checkUser(email: string, orderId: string) {
    console.log(`Checking user: ${email}, Order ID: ${orderId}`);

    // 1. Get user by email
    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email);

    if (profileError) {
        console.error('Error fetching profile:', profileError);
        return;
    }

    let userId = null;

    if (!profiles || profiles.length === 0) {
        console.log(`No profile found for email: ${email}`);

        // Let's also check by order ID directly if email didn't work
        const { data: orderById } = await supabase.from('payment_orders').select('*').eq('order_id', orderId);
        if (orderById && orderById.length > 0) {
            console.log("Order found by ID directly:", orderById);
            userId = orderById[0].user_id;
        } else {
            console.log("Order NOT found by ID directly.");
            return;
        }
    } else {
        userId = profiles[0].id;
        console.log(`Found Profile: ${profiles[0].full_name} (${userId})`);
    }

    if (!userId) return;

    // 2. Get orders
    const { data: orders, error: orderError } = await supabase
        .from('payment_orders')
        .select('*')
        .eq('user_id', userId);

    if (orderError) {
        console.error('Error fetching orders:', orderError);
    } else {
        console.log(`\nFound ${orders.length} orders:`);
        orders.forEach(o => console.log(`  Order: ${o.order_id}, Status: ${o.status}, Amount: ${o.amount}, Date: ${o.created_at}`));
    }

    // Check specific order
    const specificOrder = orders?.find(o => o.order_id === orderId);
    if (!specificOrder) {
        console.log(`\nSpecific Order ${orderId} NOT FOUND inside user's orders.`);
        const { data: globalOrder } = await supabase.from('payment_orders').select('*').eq('order_id', orderId);
        if (globalOrder && globalOrder.length > 0) {
            console.log(`\nSpecific Order found but associated with different user_id: ${globalOrder[0].user_id}. Email: ${globalOrder[0].customer_email}`);
        } else {
            console.log(`\nSpecific Order ${orderId} NOT FOUND anywhere.`);
        }
    }

    // 3. Get challenges/accounts
    const { data: challenges, error: challengeError } = await supabase
        .from('challenges')
        .select('id, login, status, challenge_type, current_balance, created_at')
        .eq('user_id', userId);

    if (challengeError) {
        console.error('Error fetching challenges:', challengeError);
    } else {
        console.log(`\nFound ${challenges.length} MT5 accounts:`);
        challenges.forEach(c => console.log(`  Login: ${c.login}, Status: ${c.status}, Type: ${c.challenge_type}, Balance: ${c.current_balance}`));
    }
}

const targetEmail = 'rihaan1909@gmail.com';
const targetOrderId = 'SF17717469945909V0XUG8P6';

checkUser(targetEmail, targetOrderId).then(() => {
    console.log("Done.");
    process.exit(0);
});
