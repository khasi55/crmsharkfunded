import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function main() {
    console.log("Checking for any webhook_logs...");

    // Check if there is a webhook logs table and query it
    const { data: logsData, error: logsError } = await supabase
        .from('webhook_logs') // Assuming this table exists based on typical setups
        .select('*')
        .eq('gateway', 'cregis')
        .order('created_at', { ascending: false })
        .limit(10);

    if (logsError) {
        console.log("Error querying webhook_logs or table missing:", logsError.message);
    } else {
        console.log("\n=== Cregis Webhook Logs ===");
        if (logsData && logsData.length > 0) {
            logsData.forEach((l: any) => {
                console.log(`[${l.created_at}] Status: ${l.status}, OrderID?: ${l.order_id || 'N/A'}`);
                console.log(`Payload: ${JSON.stringify(l)}`);
                console.log("---");
            });
        } else {
            console.log("No matching webhook logs found.");
        }
    }
}

main();
