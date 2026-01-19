
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function main() {
    console.log("🔍 Checking for recent trades (Last 24 Hours)...");

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: trades, error } = await supabase
        .from('trades')
        .select('*')
        .gte('created_at', twentyFourHoursAgo)
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error("❌ Error fetching trades:", error);
        return;
    }

    if (!trades || trades.length === 0) {
        console.log("⚠️ No trades found in the last 24 hours.");
    } else {
        console.log(`✅ Found ${trades.length} recent trades.`);
        trades.forEach(t => {
            console.log(`   - Ticket: ${t.ticket} | Login: ${t.login} | Time: ${t.open_time} | Profit: ${t.profit}`);
        });
    }

    // Check Sync Scheduler Status (if we stored it, otherwise just infer from trades)
    // We can also check 'cron_logs' if it existed, but likely not.
}

main();
