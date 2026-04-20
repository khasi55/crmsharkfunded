import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const ORDER_ID = 'SF1774225455186801898ZPY';
const GATEWAY_ID = 'ORDER-1774225459208-c0ybf';

async function cleanup() {
    console.log('--- CLEANING UP ORDER: ' + ORDER_ID + ' ---');

    const tables = [
        'payments',
        'orders',
        'accounts',
        'mt5_accounts',
        'webhook_logs',
        'payment_orders'
    ];

    for (const table of tables) {
        try {
            // Check for order_id or payment_id or id
            let query = supabase.from(table).delete();
            
            if (table === 'payment_orders') {
                query = query.or(`order_id.eq.${ORDER_ID},payment_id.eq.${GATEWAY_ID}`);
            } else if (table === 'payments') {
                query = query.or(`order_id.eq.${ORDER_ID},gateway_order_id.eq.${GATEWAY_ID}`);
            } else {
                query = query.or(`order_id.eq.${ORDER_ID},id.eq.${ORDER_ID}`);
            }

            const { data, error, count } = await query.select();
            if (error) {
                console.error(`❌ Error in ${table}:`, error.message);
            } else {
                console.log(`✅ Removed ${data?.length || 0} rows from ${table}`);
            }
        } catch (e) {
            console.error(`❌ Critical error in ${table}:`, e);
        }
    }
}

cleanup();
