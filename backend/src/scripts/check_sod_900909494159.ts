
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function main() {
    const login = '900909494159';
    console.log(`Checking SOD status for account: ${login}`);

    const { data: challenge, error } = await supabase
        .from('challenges')
        .select('id, login, status, initial_balance, start_of_day_equity, current_equity, current_balance, updated_at, created_at')
        .eq('login', login)
        .single();

    if (error) {
        console.error("Error fetching account:", error);
        return;
    }

    if (!challenge) {
        console.log("Account not found.");
        return;
    }

    console.log("--------------------------------------------------");
    console.log(`Login:              ${challenge.login}`);
    console.log(`Status:             ${challenge.status}`);
    console.log(`Initial Balance:    ${challenge.initial_balance}`);
    console.log(`Start of Day Equity:${challenge.start_of_day_equity}`);
    console.log(`Current Balance:    ${challenge.current_balance}`);
    console.log(`Current Equity:     ${challenge.current_equity}`);
    console.log("--------------------------------------------------");
}

main();
