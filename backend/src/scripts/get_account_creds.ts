
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function getCreds(login: string) {
    console.log(`🔐 Fetching credentials for ${login}...`);

    const { data: account, error } = await supabase
        .from('challenges')
        .select('login, master_password, investor_password, server, status, initial_balance, current_equity, current_balance, metadata, created_at')
        .eq('login', login)
        .single();

    if (error) {
        console.error("Error:", error.message);
        return;
    }

    if (!account) {
        console.log("❌ Account not found.");
    } else {
        console.log("✅ Account Details:");
        console.log(`Login: ${account.login}`);
        console.log(`Password: ${account.master_password}`);
        console.log(`Investor Password: ${account.investor_password}`);
        console.log(`Server: ${account.server}`);
        console.log(`Status: ${account.status}`);
        console.log("-------------------------------------------------");
        console.log(`Initial Balance: ${account.initial_balance}`);
        console.log(`Current Balance: ${account.current_balance}`);
        console.log(`Current Equity:  ${account.current_equity}`);
        console.log(`Metadata:`, JSON.stringify(account.metadata, null, 2));
    }
}

getCreds('889224450');
