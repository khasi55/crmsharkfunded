
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function main() {
    console.log(`Checking SOD Reset Status for ALL Active Accounts...`);

    const { data: challenges, error } = await supabase
        .from('challenges')
        .select('login, status, initial_balance, start_of_day_equity, current_equity, current_balance, updated_at')
        .eq('status', 'active');

    if (error) {
        console.error("Error:", error);
        return;
    }

    console.log(`Found ${challenges.length} active challenges.`);

    let suspiciousCount = 0;

    challenges.forEach(c => {
        // Condition for suspicious SOD: 
        // 1. SOD is exactly Initial Balance (never reset) AND account has moved away from initial (has trades)
        // 2. OR SOD is exactly the same as Current Equity (might mean it reset today OR no trades)
        // Ideally we want to see if SOD reflects yesterday's close.

        // Let's filter for cases where SOD == Initial Balance but Current Balance != Initial Balance
        // This strongly suggests it wasn't reset if they traded.
        const hasTraded = Math.abs(c.current_balance - c.initial_balance) > 0.01;
        const sodIsInitial = Math.abs(c.start_of_day_equity - c.initial_balance) < 0.01;

        if (hasTraded && sodIsInitial) {
            console.log(`⚠️  Potential Stale SOD: Login ${c.login} | Initial: ${c.initial_balance} | SOD: ${c.start_of_day_equity} | Current Eq: ${c.current_equity}`);
            suspiciousCount++;
        }
    });

    if (suspiciousCount === 0) {
        console.log("✅ No obvious stale SODs found (based on Initial vs SOD check).");
    } else {
        console.log(`❌ Found ${suspiciousCount} accounts with potentially stale Start of Day Equity.`);
    }
}

main();
