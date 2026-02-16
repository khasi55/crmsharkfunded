import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '/Users/viswanathreddy/Desktop/Desktop - VISWANATH’s MacBook Pro/Sharkfunded/SharkfundedCRM/crmsharkfunded/backend/.env' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function inspectOrder(orderId: string) {
    console.log(`Inspecting order: ${orderId}`);

    const { data: order, error: orderError } = await supabase
        .from('payment_orders')
        .select('*')
        .eq('order_id', orderId)
        .maybeSingle();

    if (orderError) {
        console.error('Error fetching order:', orderError);
    } else if (!order) {
        console.log('Order not found in payment_orders.');
    } else {
        console.log('Order found:', JSON.stringify(order, null, 2));
    }

    const { data: challenges, error: chalError } = await supabase
        .from('challenges')
        .select('*')
        .or(`metadata->>parent_order_id.eq.${orderId},login.eq.${order?.login}`)
        .filter('metadata', 'cs', `{"parent_order_id": "${orderId}"}`);

    // Supabase JS doesn't support complex JSON filtering easily in one go, but we can try:
    const { data: challengesByMetadata } = await supabase
        .from('challenges')
        .select('*')
        .contains('metadata', { parent_order_id: orderId });

    console.log('Challenges found by metadata:', JSON.stringify(challengesByMetadata, null, 2));

    if (order?.login) {
        const { data: challengesByLogin } = await supabase
            .from('challenges')
            .select('*')
            .eq('login', order.login);
        console.log('Challenges found by login:', JSON.stringify(challengesByLogin, null, 2));
    }

    const { data: logs } = await supabase
        .from('webhook_logs')
        .select('*')
        .eq('order_id', orderId);
    console.log('Webhook logs found:', JSON.stringify(logs, null, 2));

    const { data: participants } = await supabase
        .from('competition_participants')
        .select('*')
        .eq('user_id', order?.user_id);
    console.log('Competition participants found for user:', JSON.stringify(participants, null, 2));
}

inspectOrder('SF-GUEST-1771227235770');
