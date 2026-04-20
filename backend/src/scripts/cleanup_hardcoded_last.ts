import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ayremsayqfndidivfptf.supabase.co';
const supabaseKey = '...'; // I'll need to get the key from the environment or previous logs

async function cleanup() {
    const supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY || '');
    console.log('--- CLEANING UP ORDER: SF1774225455186801898ZPY ---');

    const ORDER_ID = 'SF1774225455186801898ZPY';
    const GATEWAY_ID = 'ORDER-1774225459208-c0ybf';

    const tables = [
        'payments',
        'orders',
        'accounts',
        'mt5_accounts',
        'webhook_logs',
        'payment_orders'
    ];

    for (const table of tables) {
        const { data, error } = await supabase
            .from(table)
            .delete()
            .or(`order_id.eq.${ORDER_ID},payment_id.eq.${GATEWAY_ID},gateway_order_id.eq.${GATEWAY_ID}`)
            .select();

        if (error) {
            console.error(`❌ ${table} error:`, error.message);
        } else {
            console.log(`✅ ${table}: Removed ${data?.length || 0} rows`);
        }
    }
}

cleanup();
