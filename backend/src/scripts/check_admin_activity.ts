import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAdmin() {
    console.log("--- Checking Admin User ---");
    const { data: user, error: userError } = await supabase
        .from('admin_users')
        .select('*')
        .eq('email', 'op747823@gmail.com')
        .maybeSingle();

    if (userError) console.error("Error fetching admin user:", userError);
    else console.log("Admin User Data:", JSON.stringify(user, null, 2));

    console.log("\n--- Checking Trader Profile ---");
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', 'op747823@gmail.com')
        .maybeSingle();

    if (profileError) console.error("Error fetching trader profile:", profileError);
    else console.log("Trader Profile Data:", JSON.stringify(profile, null, 2));

    console.log("\n--- Checking Recent Logs for this User ---");
    const { data: logs, error: logError } = await supabase
        .from('system_logs')
        .select('*')
        .ilike('message', '%op747823@gmail.com%')
        .order('created_at', { ascending: false })
        .limit(20);

    if (logError) console.error("Error fetching logs:", logError);
    else console.log("Recent Logs:", JSON.stringify(logs, null, 2));
}

checkAdmin();
