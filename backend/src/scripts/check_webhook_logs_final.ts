
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function check() {
    const orderId = 'SFORD177055825712486b414df';
    console.log(`Checking logs for order: ${orderId}`);

    const { data: logs, error } = await supabase
        .from('webhook_logs')
        .select('*')
        .eq('order_id', orderId)
        .order('received_at', { ascending: false });

    if (error) {
        console.error('Error fetching logs:', error.message);
        return;
    }

    if (!logs || logs.length === 0) {
        console.log('No webhook logs found.');
        return;
    }

    console.log(`Found ${logs.length} logs.`);
    logs.forEach((l, i) => {
        console.log(`Log ${i + 1}:`);
        console.log(`- Time: ${l.received_at}`);
        console.log(`- Status: ${l.status}`);
        console.log(`- Error: ${l.error_message}`);
        console.log(`- Request Body keys: ${Object.keys(l.request_body || {})}`);
        console.log(`- Request Body snippets: ${JSON.stringify(l.request_body).substring(0, 100)}...`);
    });
}

check();
