
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
    console.log("Searching for unlinked webhook logs related to VIVEK or payment_id...");

    // 1. Search for VIVEK in request_body
    const { data: vivekLogs } = await supabase
        .from('webhook_logs')
        .select('*')
        .filter('request_body::text', 'ilike', '%VIVEK%');
    
    if (vivekLogs && vivekLogs.length > 0) {
        console.log(`Found ${vivekLogs.length} logs containing 'VIVEK':`);
        console.log(JSON.stringify(vivekLogs, null, 2));
    } else {
        console.log("No logs found containing 'VIVEK'.");
    }

    // 2. Search for payment_id b70032d7-ab82-4dc0-acce-e556e5867fa7
    const paymentId = 'b70032d7-ab82-4dc0-acce-e556e5867fa7';
    const { data: paymentIdLogs } = await supabase
        .from('webhook_logs')
        .select('*')
        .filter('request_body::text', 'ilike', `%${paymentId}%`);

    if (paymentIdLogs && paymentIdLogs.length > 0) {
        console.log(`Found ${paymentIdLogs.length} logs containing payment_id:`);
        console.log(JSON.stringify(paymentIdLogs, null, 2));
    } else {
        console.log("No logs found containing the specific payment_id.");
    }

    // 3. Search for the email directly in webhook logs
    const email = 'VIVEKMISHRAGTA@GMAIL.COM';
    const { data: emailLogs } = await supabase
        .from('webhook_logs')
        .select('*')
        .filter('request_body::text', 'ilike', `%${email}%`);
    
    if (emailLogs && emailLogs.length > 0) {
        console.log(`Found ${emailLogs.length} logs containing email:`);
        console.log(JSON.stringify(emailLogs, null, 2));
    } else {
        console.log("No logs found containing the email.");
    }
}

main();
