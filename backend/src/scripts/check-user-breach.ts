import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAccount() {
    const CHALLENGE_ID = '6c8a10bb-e275-45ec-885f-5bfc640199ac';
    console.log(`Checking account config for ${CHALLENGE_ID}...`);

    const { data: challenge, error: cError } = await supabase
        .from('challenges')
        .select('*')
        .eq('id', CHALLENGE_ID)
        .single();

    if (cError) {
        console.error('Error fetching challenge:', cError);
        return;
    }

    console.log(`Challenge Details:`, JSON.stringify(challenge, null, 2));

    // We can see the tier rule from `challenge_tier_id` or similar

    const logInitial = 10000;
    const logSOD = 9951.09;
    const logEquity = 9260.04;

    // Most standard challenges have daily drawdown of 5% and max drawdown of 10%
    // In risk_engine.py:
    // rule_daily = user_rules.get("daily_drawdown_percent", 5.0)
    // limit = sod_equity * (1 - float(rule_daily) / 100)

    console.log(`\nLet's test with Daily: 5% Max: 10%`);
    const dailyLimit = logSOD * 0.95;
    const maxLimit = logInitial * 0.90;

    console.log(`Daily Limit (5%): ${dailyLimit.toFixed(2)}`);
    console.log(`Max Limit (10%): ${maxLimit.toFixed(2)}`);

    if (logEquity <= dailyLimit) {
        console.log(`=> BREACHED (Daily Drawdown)`);
    } else if (logEquity <= maxLimit) {
        console.log(`=> BREACHED (Max Drawdown)`);
    } else {
        console.log(`=> ACTIVE (No Breach)`);
    }
}

checkAccount();
