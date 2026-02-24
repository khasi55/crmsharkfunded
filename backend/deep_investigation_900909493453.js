const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing Supabase credentials in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const login = 900909493453;
    const challengeId = "a1521d77-69b0-43d6-b277-d0a9b3535a4f";

    console.log(`🔍 Exhaustive investigation for account ${login} (ID: ${challengeId})...`);

    // 1. Logs
    const { data: logs, error: lError } = await supabase
        .from('system_logs')
        .select('*')
        .or(`message.ilike.%${login}%,details->>challenge_id.eq.${challengeId},details->>login.eq.${login}`)
        .order('created_at', { ascending: false });

    console.log(`\n📜 [System Logs: ${logs ? logs.length : 0}]`);
    if (logs) logs.slice(0, 10).forEach(l => console.log(`[${l.created_at}] [${l.level}] ${l.message}`));

    // 2. Risk Violations
    const { data: violations, error: vError } = await supabase
        .from('risk_violations')
        .select('*')
        .eq('challenge_id', challengeId);

    console.log(`\n🛑 [Risk Violations: ${violations ? violations.length : 0}]`);
    console.log(JSON.stringify(violations, null, 2));

    // 3. Daily Stats
    const { data: stats, error: sError } = await supabase
        .from('daily_stats')
        .select('*')
        .eq('challenge_id', challengeId)
        .order('date', { ascending: false });

    console.log(`\n📈 [Daily Stats: ${stats ? stats.length : 0}]`);
    if (stats) stats.forEach(s => {
        console.log(`[${s.date}] Balance: ${s.balance} | Equity: ${s.equity} | SOD: ${s.start_of_day_equity}`);
    });

    // 4. Check for any other breaches in the same user
    const { data: challenge } = await supabase.from('challenges').select('user_id').eq('id', challengeId).single();
    if (challenge) {
        const { data: allChallenges } = await supabase.from('challenges').select('login, status').eq('user_id', challenge.user_id);
        console.log("\n👤 [User's Other Accounts]");
        console.log(JSON.stringify(allChallenges, null, 2));
    }
}

main();
