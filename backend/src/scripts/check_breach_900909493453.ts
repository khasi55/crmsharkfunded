import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing Supabase credentials in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function main() {
    const login = 900909493453;
    console.log(`🔍 Investigating breach for account ${login}...`);

    // 1. Fetch Challenge Details
    const { data: challenge, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('login', login)
        .single();

    if (error || !challenge) {
        console.error("❌ Error fetching challenge:", error);
        return;
    }

    console.log("\n📊 [Challenge Details]");
    console.log(JSON.stringify(challenge, null, 2));

    // 2. Fetch Risk Violations
    const { data: violations } = await supabase
        .from('risk_violations')
        .select('*')
        .eq('challenge_id', challenge.id)
        .order('created_at', { ascending: false });

    console.log("\n🛑 [Risk Violations]");
    console.log(JSON.stringify(violations, null, 2));

    // 3. Fetch Recent Trades
    const { data: trades } = await supabase
        .from('trades')
        .select('*')
        .eq('challenge_id', challenge.id)
        .order('close_time', { ascending: false })
        .limit(10);

    console.log("\n📈 [Recent Trades]");
    console.log(JSON.stringify(trades, null, 2));
}

main();
