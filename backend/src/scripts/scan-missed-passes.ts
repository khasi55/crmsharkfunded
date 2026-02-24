import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function scanAllAccounts() {
    console.log("Fetching all active challenge accounts...");
    const { data: challenges, error: challengesErr } = await supabase
        .from('challenges')
        .select('*')
        .eq('status', 'active');

    if (challengesErr) {
        console.error("Error fetching challenges:", challengesErr);
        return;
    }

    console.log(`Found ${challenges.length} active accounts. Checking against rules...`);

    const { data: rulesList, error: rulesErr } = await supabase
        .from('challenge_type_rules')
        .select('*');

    if (rulesErr) {
        console.error("Error fetching rules:", rulesErr);
        return;
    }

    const rulesMap = new Map();
    for (const r of rulesList) {
        rulesMap.set(r.challenge_type, r);
    }

    let missedPasses = [];

    for (const c of challenges) {
        let rule = rulesMap.get(c.challenge_type);

        // Try fallback if strict match fails (from risk-scheduler logic)
        if (!rule) {
            const typeStr = (c.challenge_type || '').toLowerCase();
            if (typeStr.includes('competition')) {
                rule = { profit_target_percent: 0 }; // usually competitive is end of month
            } else {
                // Assuming standard fallback if not found
                continue;
            }
        }

        if (rule && rule.profit_target_percent > 0) {
            const initialBalance = Number(c.initial_balance);
            if (initialBalance <= 0) continue;

            const targetEquity = initialBalance * (1 + (rule.profit_target_percent / 100));

            if (Number(c.current_equity) >= targetEquity) {
                missedPasses.push({
                    login: c.login,
                    type: c.challenge_type,
                    initial: initialBalance,
                    current_equity: Number(c.current_equity),
                    target: targetEquity,
                    diff: Number(c.current_equity) - targetEquity
                });
            }
        }
    }

    if (missedPasses.length > 0) {
        console.log(`\n🚨 FOUND ${missedPasses.length} ACCOUNTS THAT HIT TARGET BUT ARE STILL ACTIVE!🚨`);
        console.table(missedPasses);
    } else {
        console.log("\n✅ All active accounts are below their profit targets. No missed passes found.");
    }
}

scanAllAccounts();
