import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const orderId = 'SF17742098896703U5P77JSB';
    console.log(`Searching for webhook logs related to order: ${orderId}...`);

    const { data: logs, error } = await supabase
        .from('webhook_logs')
        .select('*')
        .filter('request_body::text', 'ilike', `%${orderId}%`)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching logs:", error);
        return;
    }

    if (!logs || logs.length === 0) {
        console.log("No webhook logs found for this order ID.");
    } else {
        console.log(`Found ${logs.length} logs:`);
        logs.forEach((log, index) => {
            console.log(`--- Log ${index + 1} (${log.created_at}) ---`);
            console.log('Gateway:', log.gateway);
            console.log('Body:', JSON.stringify(log.request_body, null, 2));
        });
    }
}

main();
