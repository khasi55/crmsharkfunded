const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    const login = "900909493453";
    const cid = "a1521d77-69b0-43d6-b277-d0a9b3535a4f";

    console.log('🔍 Searching ALL records for login:', login);

    // 1. Search system_logs
    const { data: logs } = await supabase
        .from('system_logs')
        .select('*')
        .or(`message.ilike.%${login}%,details->>login.eq.${login},details->>challenge_id.eq.${cid}`)
        .order('created_at', { ascending: false });

    console.log(`\n📜 [System Logs: ${logs ? logs.length : 0}]`);
    if (logs) logs.forEach(l => {
        if (l.message.toLowerCase().includes('breach') || l.message.toLowerCase().includes('status')) {
            console.log(`[${l.created_at}] [${l.level}] ${l.message}`);
            if (l.details) console.log('   Details:', JSON.stringify(l.details));
        }
    });

    // 2. Search core_risk_violations
    const { data: coreViolations } = await supabase
        .from('core_risk_violations')
        .select('*')
        .eq('challenge_id', cid);

    console.log(`\n🛑 [Core Risk Violations: ${coreViolations ? coreViolations.length : 0}]`);
    if (coreViolations) console.log(JSON.stringify(coreViolations, null, 2));

    // 3. Search risk_violations
    const { data: violations } = await supabase
        .from('risk_violations')
        .select('*')
        .eq('challenge_id', cid);

    console.log(`\n🛑 [Risk Violations: ${violations ? violations.length : 0}]`);
    if (violations) console.log(JSON.stringify(violations, null, 2));
}

main();
