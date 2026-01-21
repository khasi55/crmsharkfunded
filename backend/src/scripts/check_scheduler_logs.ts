
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function main() {
    console.log("🔍 Checking System Logs for Scheduler Activity...");

    // 1. Check for success logs
    const { data: successLogs, error: err1 } = await supabase
        .from('system_logs')
        .select('*')
        .ilike('message', '%Daily Reset%')
        .order('created_at', { ascending: false })
        .limit(10);

    if (successLogs && successLogs.length > 0) {
        console.log(`\n✅ Found ${successLogs.length} 'Daily Reset' logs:`);
        successLogs.forEach(l => console.log(`   [${l.created_at}] ${l.level}: ${l.message}`));
    } else {
        console.log("\n⚠️  No 'Daily Reset' logs found in the last 10 entries.");
    }

    // 2. Check for ANY logs from RiskScheduler to verify logging is active
    const { data: anyLogs, error: err2 } = await supabase
        .from('system_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (anyLogs && anyLogs.length > 0) {
        console.log(`\n📋 Recent General System Logs (to verify logging works):`);
        anyLogs.forEach(l => console.log(`   [${l.created_at}] [${l.source || 'Unknown'}] ${l.message}`));
    } else {
        console.log("\n❌ No system logs found AT ALL. Logging might be broken or empty.");
    }
}

main();
