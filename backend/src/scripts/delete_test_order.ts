// @ts-nocheck
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config();

console.log('SUPABASE_URL present:', !!process.env.SUPABASE_URL);

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function deleteOrder(orderId: string) {
    console.log(`Deleting order: ${orderId}`);

    // 1. Get the order to see if it exists and get internal ID
    const { data: order, error: findError } = await supabase
        .from('payment_orders')
        .select('*')
        .eq('order_id', orderId)
        .single();

    if (findError || !order) {
        console.error('Order not found or error finding it:', findError?.message);
        // It might be already deleted, but let's check if there's a challenge with metadata pointing to it?
        // For now, just exit if order is not found in payment_orders
        return;
    }

    console.log('Found order:', order.id, 'Status:', order.status, 'ChallengeID:', order.challenge_id);

    // 2. Delete the order
    const { error: deleteError } = await supabase
        .from('payment_orders')
        .delete()
        .eq('order_id', orderId);

    if (deleteError) {
        console.error('Error deleting order:', deleteError.message);
    } else {
        console.log('Successfully deleted order from payment_orders.');
    }

    // 3. Delete associated challenge if it exists
    if (order.challenge_id) {
        console.log(`Deleting associated challenge: ${order.challenge_id}`);
        const { error: challengeDeleteError } = await supabase
            .from('challenges')
            .delete()
            .eq('id', order.challenge_id);

        if (challengeDeleteError) {
            console.error('Error deleting challenge:', challengeDeleteError.message);
        } else {
            console.log('Successfully deleted associated challenge.');
        }
    }
}

deleteOrder('SF1771162477911OTLBQOTYO');
