
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
    console.log("Fetching SharkPay webhook logs from the last 24 hours...");

    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);

    const { data: logs, error } = await supabase
        .from('webhook_logs')
        .select('*')
        .eq('gateway', 'sharkpay')
        .gt('created_at', yesterday.toISOString())
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching logs:", error);
        return;
    }

    if (!logs || logs.length === 0) {
        console.log("No SharkPay logs found in the last 24 hours.");
        
        // Try searching by request_body containing "sharkpay" just in case gateway column is wrong
        const { data: altLogs } = await supabase
            .from('webhook_logs')
            .select('*')
            .filter('request_body::text', 'ilike', '%sharkpay%')
            .gt('created_at', yesterday.toISOString());
        
        if (altLogs && altLogs.length > 0) {
            console.log(`Found ${altLogs.length} logs via request_body search:`);
            console.log(JSON.stringify(altLogs, null, 2));
        } else {
            console.log("No logs found via alternate search either.");
        }
    } else {
        console.log(`Found ${logs.length} logs:`);
        console.log(JSON.stringify(logs, null, 2));
    }
}

main();
