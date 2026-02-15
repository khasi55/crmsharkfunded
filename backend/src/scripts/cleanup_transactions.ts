import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars from .env file in backend root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteRange(name: string, start: string, end: string) {
    console.log(`\n--- Deleting ${name} (${start} to ${end}) ---`);

    // 1. Payment Orders
    const { count: ordersCount, error: ordersError } = await supabase
        .from('payment_orders')
        .delete({ count: 'exact' })
        .gte('created_at', start)
        .lt('created_at', end);

    if (ordersError) console.error('Error deleting payment_orders:', ordersError);
    else console.log(`Deleted ${ordersCount} from payment_orders`);

    // 2. Webhook Logs
    const { count: logsCount, error: logsError } = await supabase
        .from('webhook_logs')
        .delete({ count: 'exact' })
        .gte('received_at', start)
        .lt('received_at', end);

    if (logsError) console.error('Error deleting webhook_logs:', logsError);
    else console.log(`Deleted ${logsCount} from webhook_logs`);

    // 3. Affiliate Earnings
    const { count: earningsCount, error: earningsError } = await supabase
        .from('affiliate_earnings')
        .delete({ count: 'exact' })
        .gte('created_at', start)
        .lt('created_at', end);

    if (earningsError) console.error('Error deleting affiliate_earnings:', earningsError);
    else console.log(`Deleted ${earningsCount} from affiliate_earnings`);
}

async function main() {
    // Range 1: Jan 15 (Whole Day)
    await deleteRange('Jan 15', '2026-01-15T00:00:00Z', '2026-01-16T00:00:00Z');

    // Range 2: Jan 26 - Jan 31 (Inclusive, up to Feb 1)
    await deleteRange('Jan 26 - Jan 31', '2026-01-26T00:00:00Z', '2026-02-01T00:00:00Z');

    console.log('\nCleanup complete.');
}

main();
