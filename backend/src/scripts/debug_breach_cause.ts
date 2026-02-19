
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugBreachCause(logins: string[]) {
    console.log(`\n🔍 Investigating Breach Cause for Logins: ${logins.join(', ')}`);

    for (const login of logins) {
        console.log(`\n--- Account: ${login} ---`);

        // 1. Fetch Challenge Data
        const { data: challenge, error: challengeError } = await supabase
            .from('challenges')
            .select('*')
            .eq('login', login)
            .single();

        if (challengeError || !challenge) {
            console.error(`❌ Error fetching challenge ${login}:`, challengeError?.message);
            continue;
        }

        console.log(`Status: ${challenge.status}`);
        console.log(`Group: ${challenge.group}`);
        console.log(`Initial Balance: ${challenge.initial_balance}`);
        console.log(`SOD Equity: ${challenge.start_of_day_equity}`);
        console.log(`Current Equity: ${challenge.current_equity}`);
        console.log(`Current Balance: ${challenge.current_balance}`);

        // 2. Fetch Risk Group Rules
        const normalizedGroup = (challenge.group || '').replace(/\\\\/g, '\\').toLowerCase();
        const { data: riskGroups } = await supabase.from('mt5_risk_groups').select('*');
        let rule = riskGroups?.find(g => g.group_name.replace(/\\\\/g, '\\').toLowerCase() === normalizedGroup);

        if (!rule) {
            console.warn(`⚠️ No specific risk group found for ${challenge.group}, using defaults.`);
            rule = { max_drawdown_percent: 10, daily_drawdown_percent: 5 };
        } else {
            console.log(`Rule: Max DD ${rule.max_drawdown_percent}%, Daily DD ${rule.daily_drawdown_percent}%`);
        }

        // 3. Calculate Limits
        const initialBalance = Number(challenge.initial_balance);
        const sodEquity = Number(challenge.start_of_day_equity ?? initialBalance);

        const totalLimit = initialBalance * (1 - (rule.max_drawdown_percent / 100));
        const dailyLimit = sodEquity * (1 - (rule.daily_drawdown_percent / 100));
        const effectiveLimit = Math.max(totalLimit, dailyLimit);

        console.log(`Calculated Total Limit: ${totalLimit}`);
        console.log(`Calculated Daily Limit: ${dailyLimit} (Based on SOD: ${sodEquity})`);
        console.log(`Effective Limit (Stricter): ${effectiveLimit}`);
        console.log(`Is Locally Breached? ${challenge.current_equity < effectiveLimit}`);

        // 4. Check Violations
        const { data: violations } = await supabase
            .from('risk_violations')
            .select('*')
            .eq('challenge_id', challenge.id)
            .order('created_at', { ascending: false })
            .limit(5);

        if (violations && violations.length > 0) {
            console.log(`\nRecent Violations:`);
            violations.forEach(v => {
                console.log(`- [${v.created_at}] ${v.violation_type}: ${JSON.stringify(v.details)}`);
            });
        } else {
            console.log(`\nNo recent violations found in risk_violations.`);
        }

        // 5. Check System Logs
        const { data: systemLogs } = await supabase
            .from('system_logs')
            .select('*')
            .ilike('message', `%${login}%`)
            .order('created_at', { ascending: false })
            .limit(10);

        if (systemLogs && systemLogs.length > 0) {
            console.log(`\nRecent System Logs:`);
            systemLogs.forEach(l => {
                console.log(`- [${l.created_at}] [${l.level}] ${l.message}`);
                if (l.details) {
                    console.log(`  Details: ${JSON.stringify(l.details)}`);
                }
            });
        }
    }
}

const logins = process.argv.slice(2);
if (logins.length === 0) {
    debugBreachCause(['900909492933', '900909492934']);
} else {
    debugBreachCause(logins);
}
