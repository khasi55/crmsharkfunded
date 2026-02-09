
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkBreach() {
    const login = 900909491582;
    console.log(`Checking details for account ${login}...`);

    // 1. Get Challenge ID
    const { data: challenge } = await supabase
        .from('challenges')
        .select('*')
        .eq('login', login)
        .single();

    if (!challenge) {
        console.log("❌ Account not found.");
        return;
    }

    console.log("⚠️ Account Status:", challenge.status);
    console.log("💰 Equity:", challenge.current_equity);
    console.log("💰 Balance:", challenge.current_balance);
    console.log("📉 Initial Balance:", challenge.initial_balance);

    // 2. Get Violations
    const { data: violations } = await supabase
        .from('risk_violations')
        .select('*')
        .eq('challenge_id', challenge.id)
        .order('created_at', { ascending: false });

    console.log("\n📜 Risk Violations:");
    if (violations && violations.length > 0) {
        violations.forEach(v => {
            console.log(`- [${v.created_at}] Type: ${v.violation_type}`);
            console.log(`  Details:`, JSON.stringify(v.details, null, 2));
        });
    } else {
        console.log("✅ No violations found in DB.");
    }
}

checkBreach();
