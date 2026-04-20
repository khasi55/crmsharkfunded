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
    console.log("Searching for order/payment IDs in ALL webhook logs...");

    const { data: logs, error } = await supabase
        .from('webhook_logs')
        .select('*')
        .order('received_at', { ascending: false })
        .limit(100); // Check last 100 logs just in case

    if (error) {
        console.error("Error fetching logs:", error);
        return;
    }

    const orderId = 'SF17742098896703U5P77JSB';
    const paymentId = '608288975120';

    const matchingLogs = logs.filter(log => {
        const bodyStr = JSON.stringify(log.request_body);
        return bodyStr.includes(orderId) || bodyStr.includes(paymentId);
    });

    if (matchingLogs.length === 0) {
        console.log("No matching logs found in the last 100 entries.");
        
        // Try searching for "sharkpay" specifically
        const sharkpayLogs = logs.filter(log => {
             const bodyStr = JSON.stringify(log.request_body);
             return bodyStr.toLowerCase().includes('sharkpay') || (log.gateway && log.gateway.toLowerCase().includes('sharkpay'));
        });
        console.log(`Found ${sharkpayLogs.length} logs mentioning 'sharkpay'.`);
        sharkpayLogs.forEach(l => console.log(`- ${l.received_at}: Gateway: ${l.gateway}, Status: ${l.status}`));
    } else {
        console.log(`Found ${matchingLogs.length} matching logs:`);
        matchingLogs.forEach((log, index) => {
            console.log(`--- MATCHING Log ${index + 1} (${log.received_at}) ---`);
            console.log('Gateway:', log.gateway);
            console.log('Body:', JSON.stringify(log.request_body, null, 2));
        });
    }
}

main();
