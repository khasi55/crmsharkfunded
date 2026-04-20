import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function main() {
    const login = process.argv[2];
    if (!login) {
        console.error("Please provide a login as an argument.");
        process.exit(1);
    }

    console.log(`Checking breaches and state for account: ${login}`);

    // 1. Fetch Challenge
    const { data: challenge, error: cError } = await supabase
        .from('challenges')
        .select('*')
        .eq('login', login)
        .single();

    if (cError) {
        console.error("Error fetching account:", cError.message);
        return;
    }

    console.log(`Current Status: ${challenge.status}`);
    console.log(`Is Active: ${challenge.is_active}`);

    // 2. Fetch Breaches
    const { data: breaches, error: bError } = await supabase
        .from('breaches')
        .select('*')
        .eq('account_id', login)
        .order('created_at', { ascending: false });

    if (bError) {
        console.error("Error fetching breaches:", bError.message);
    } else if (breaches && breaches.length > 0) {
        console.log(`\nFound ${breaches.length} breaches:`);
        breaches.forEach(b => {
            console.log(`[${b.created_at}] Reason: ${b.reason}`);
            console.log(`Details:`, JSON.stringify(b.details, null, 2));
            console.log(`Equity at breach: ${b.equity}, Balance at breach: ${b.balance}`);
            console.log('---');
        });
    } else {
        console.log("\nNo breaches found in the 'breaches' table.");
    }

    // 3. Check System Logs for this login
    const { data: logs, error: lError } = await supabase
        .from('system_logs')
        .select('*')
        .ilike('message', `%${login}%`)
        .order('created_at', { ascending: false })
        .limit(10);

    if (lError) {
        console.error("Error fetching logs:", lError.message);
    } else if (logs && logs.length > 0) {
        console.log(`\nRecent System Logs for ${login}:`);
        logs.forEach(l => {
            console.log(`[${l.created_at}] ${l.message}`);
        });
    }
}

main();
