
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const searchTerm = '/api/webhooks/cregis';
    console.log(`Checking SYSTEM logs for path: ${searchTerm}`);

    const { data: logs, error } = await supabase
        .from('system_logs')
        .select('*')
        .ilike('message', `%${searchTerm}%`)
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Error fetching webhook logs:', error.message);
    } else if (logs && logs.length > 0) {
        console.log(`\n✅ Found ${logs.length} webhook logs:`);
        logs.forEach(log => {
            console.log(`\n--- Log ID: ${log.id} ---`);
            console.log('Created At:', log.created_at);
            console.log('Gateway:', log.gateway);
            console.log('Status:', log.status);
            console.log('Order ID:', log.order_id);
            console.log('Body:', JSON.stringify(log.request_body, null, 2));
        });
    } else {
        console.log('\n❌ No webhook logs found for this ID.');

        // 2. Fallback: List ANY recent Cregis logs to see if we missed it
        console.log('\nChecking recent Cregis logs (last 5)...');
        const { data: recentCregis } = await supabase
            .from('webhook_logs')
            .select('*')
            .eq('gateway', 'cregis')
            .order('created_at', { ascending: false })
            .limit(5);

        if (recentCregis && recentCregis.length > 0) {
            recentCregis.forEach(log => {
                console.log(`- [${log.created_at}] Order: ${log.order_id}, Status: ${log.status}`);
            });
        } else {
            console.log('No recent Cregis logs found.');
        }
    }
}

main();
