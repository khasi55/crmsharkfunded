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

async function checkAccountInfo() {
    const login = '900909495058';
    console.log(`Checking DB state for account ${login}...`);

    // Check main challenges table
    const { data: challenge, error } = await supabase
        .from('challenges')
        .select('id, initial_balance, current_balance, current_equity, start_of_day_equity, status')
        .eq('login', login)
        .single();

    if (error) {
        console.error("Error finding challenge:", error);
    } else {
        console.log("\n--- CHALLENGE DATA ---");
        console.log("Initial Balance:", challenge.initial_balance);
        console.log("Current Balance:", challenge.current_balance);
        console.log("Current Equity:", challenge.current_equity);
        console.log("Start of Day Equity:", challenge.start_of_day_equity);
        console.log("Status:", challenge.status);

        // Let's compute those metrics right here to see if there's a discrepancy
        const eq = Number(challenge.current_equity || 0);
        const sod = Number(challenge.start_of_day_equity || challenge.initial_balance);
        const initial = Number(challenge.initial_balance || 0);

        const dailyNet = eq - sod;
        const totalNet = eq - initial;

        console.log("\n--- COMPUTED DISCREPANCIES ---");
        console.log("Daily Net Change:", dailyNet);
        console.log("Computed Daily Loss:", dailyNet < 0 ? Math.abs(dailyNet) : 0);
        console.log("Total Net Change:", totalNet);
        console.log("Computed Total Loss:", totalNet < 0 ? Math.abs(totalNet) : 0);
    }
}
checkAccountInfo();
