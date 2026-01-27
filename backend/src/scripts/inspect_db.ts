
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function main() {
    console.log("Listing tables in public schema...");

    // We can't easily list tables with supabase-js client directly without rpc or specific permissions usually.
    // But we can try to infer from what we know or use a known hack if enabled.
    // Actually, let's just inspect 'system_logs' and 'challenges' structure deeper.

    // 1. Inspect 'challenges' columns (by selecting all from one row)
    const { data: challenge } = await supabase.from('challenges').select('*').limit(1);
    if (challenge && challenge.length > 0) {
        console.log("Challenges Table Columns:", Object.keys(challenge[0]));
    }

    // 2. Inspect 'system_logs'
    const { data: logs } = await supabase.from('system_logs').select('*').limit(1);
    if (logs && logs.length > 0) {
        console.log("System Logs Columns:", Object.keys(logs[0]));
    }

    // 3. Search for logs for the user 889225368 on Jan 22
    const login = 889225368;
    console.log(`\nSearching for logs for login: ${login} around Jan 22...`);

    const { data: userLogs } = await supabase
        .from('system_logs')
        .select('*')
        .ilike('message', `%${login}%`)
        .gte('created_at', '2026-01-22T00:00:00')
        .lt('created_at', '2026-01-23T00:00:00')
        .order('created_at', { ascending: true });

    if (userLogs && userLogs.length > 0) {
        userLogs.forEach(l => {
            console.log(`[${l.created_at}] ${l.message}`);
        });
    } else {
        console.log("No logs found for Jan 22.");
    }

}

main();
