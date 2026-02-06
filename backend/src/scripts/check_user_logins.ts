import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSpecificAccounts() {
    const logins = [900909490654, 900909490652];
    console.log(`🔍 Checking state for Logins: ${logins.join(', ')}...`);

    const { data: accounts, error } = await supabase
        .from('challenges')
        .select('id, login, status, upgraded_to, challenge_type, current_balance, initial_balance')
        .in('login', logins);

    if (error) {
        console.error("❌ Error fetching accounts:", error);
        return;
    }

    console.log(`✅ Found ${accounts.length} accounts:`);
    accounts.forEach(acc => {
        console.log(`[${acc.login}] Status: ${acc.status}, UpgradedTo: ${acc.upgraded_to}, Type: ${acc.challenge_type}, Bal: ${acc.current_balance}/${acc.initial_balance}`);
    });
}

checkSpecificAccounts();
