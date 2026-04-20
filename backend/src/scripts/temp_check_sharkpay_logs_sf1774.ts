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
    console.log("Fetching ALL SharkPay webhook logs from the last 24 hours...");

    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);

    const { data: logs, error } = await supabase
        .from('webhook_logs')
        .select('*')
        .eq('gateway', 'sharkpay')
        .gt('received_at', yesterday.toISOString())
        .order('received_at', { ascending: false });

    if (error) {
        console.error("Error fetching logs:", error);
        return;
    }

    if (!logs || logs.length === 0) {
        console.log("No SharkPay logs found.");
    } else {
        console.log(`Found ${logs.length} logs:`);
        logs.forEach((log, index) => {
            const body = log.request_body;
            const bodyStr = JSON.stringify(body);
            if (bodyStr.includes('608288975120') || bodyStr.includes('SF17742098896703U5P77JSB')) {
                console.log(`--- MATCHING Log ${index + 1} (${log.received_at}) ---`);
                console.log(JSON.stringify(body, null, 2));
            }
        });
    }
}

main();
