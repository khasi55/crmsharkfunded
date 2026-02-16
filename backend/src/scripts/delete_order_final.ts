import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '/Users/viswanathreddy/Desktop/Desktop - VISWANATH’s MacBook Pro/Sharkfunded/SharkfundedCRM/crmsharkfunded/backend/.env' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function performDeletion(orderId: string, userId: string) {
    console.log(`Starting deletion for order: ${orderId} and user: ${userId}`);

    // 1. Delete Webhook Logs
    console.log(`Deleting webhook logs for order: ${orderId}`);
    const { error: logError } = await supabase
        .from('webhook_logs')
        .delete()
        .eq('order_id', orderId);

    if (logError) {
        console.error('Error deleting webhook logs:', logError.message);
    } else {
        console.log('Successfully deleted webhook logs.');
    }

    // 2. Delete Payment Order
    console.log(`Deleting payment order: ${orderId}`);
    const { error: orderError } = await supabase
        .from('payment_orders')
        .delete()
        .eq('order_id', orderId);

    if (orderError) {
        console.error('Error deleting payment order:', orderError.message);
    } else {
        console.log('Successfully deleted payment order.');
    }

    // 3. Delete Profile
    console.log(`Deleting profile for user: ${userId}`);
    const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

    if (profileError) {
        console.error('Error deleting profile:', profileError.message);
    } else {
        console.log('Successfully deleted profile.');
    }

    // 4. Delete Auth User
    console.log(`Deleting auth user: ${userId}`);
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);

    if (authError) {
        console.error('Error deleting auth user:', authError.message);
    } else {
        console.log('Successfully deleted auth user.');
    }

    console.log('Deletion process completed.');
}

// User ID and Order ID from inspection
const ORDER_ID = 'SF-GUEST-1771227235770';
const USER_ID = '4f9a7247-3eeb-4532-8c84-3afbcb13630c';

performDeletion(ORDER_ID, USER_ID);
