import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('/Users/viswanathreddy/Desktop/Sharkfunded/crmsharkfunded/backend/.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLogins() {
    const logins = [502027, 503650, 513721];

    console.log("--- Checking Challenges ---");
    const { data: challenges } = await supabase
        .from('challenges')
        .select('id, login, status, user_id')
        .in('login', logins);
    console.log("Challenges:", JSON.stringify(challenges, null, 2));

    console.log("\n--- Checking Webhook Logs ---");
    const { data: webhooks } = await supabase
        .from('webhook_logs')
        .select('*')
        .contains('request_body', { login: 502027 }); // Just check one to see if structure matches
    console.log("Webhook Sample for 502027:", JSON.stringify(webhooks, null, 2));
}

checkLogins();
