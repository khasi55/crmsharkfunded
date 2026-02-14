
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars from backend .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const EXCEPT_ORDER_IDS = [
    'SF1771056865268A2TVR5D55',
    'SF177106032773920OGL9UZB',
    'SF1771059631193ZKLI3HMLF'
];

async function main() {
    console.log('🚀 Starting Bulk Clean for last 24 hours...');

    // 1. Calculate time 24 hours ago
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);
    const timeString = yesterday.toISOString();
    console.log(`Checking orders created after: ${timeString}`);

    // 2. Fetch orders within timeframe
    const { data: orders, error: fetchError } = await supabase
        .from('payment_orders')
        .select('order_id, challenge_id, created_at')
        .gt('created_at', timeString);

    if (fetchError || !orders) {
        console.error('Error fetching orders:', fetchError);
        return;
    }

    // 3. Filter out exceptions
    const toDelete = orders.filter(o => !EXCEPT_ORDER_IDS.includes(o.order_id));

    if (toDelete.length === 0) {
        console.log('✅ No orders found to delete (after filtering).');
        return;
    }

    console.log(`Found ${orders.length} recent orders.`);
    console.log(`Preserving ${orders.length - toDelete.length} orders.`);
    console.log(`Preparing to delete ${toDelete.length} orders...`);

    const orderIdsToDelete = toDelete.map(o => o.order_id);
    const challengeIdsToDelete = toDelete.map(o => o.challenge_id).filter(Boolean);

    // 4. Delete Challenges First
    if (challengeIdsToDelete.length > 0) {
        const { error: challengeError } = await supabase
            .from('challenges')
            .delete()
            .in('id', challengeIdsToDelete);

        if (challengeError) console.error('Error deleting challenges:', challengeError);
        else console.log(`✅ Deleted ${challengeIdsToDelete.length} linked challenges.`);
    }

    // 5. Delete Payments
    const { error: paymentError } = await supabase
        .from('payment_orders')
        .delete()
        .in('order_id', orderIdsToDelete);

    if (paymentError) {
        console.error('Error deleting payments:', paymentError);
    } else {
        console.log(`✅ Deleted ${orderIdsToDelete.length} payment orders.`);
    }

    // 6. Retry Deleting Orphaned Challenges
    if (challengeIdsToDelete.length > 0) {
        console.log('Retrying orphaned challenge deletion...');
        const { error: retryError } = await supabase
            .from('challenges')
            .delete()
            .in('id', challengeIdsToDelete);

        if (retryError) console.error('Error deleting orphaned challenges:', retryError);
        else console.log(`✅ Deleted ${challengeIdsToDelete.length} orphaned challenges.`);
    }

    console.log('🎉 Bulk Deletion Complete!');
}

main().catch(console.error);
