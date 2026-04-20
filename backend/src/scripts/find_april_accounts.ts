import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function findAprilAccounts() {
    console.log('🔍 Searching for MT5 accounts created on April 3 and 4...');
    
    // Define the range for April 3 and 4, 2026
    // Since the system time is 2026-04-05, we look at the last two days.
    const start = '2026-04-03T00:00:00Z';
    const end = '2026-04-04T23:59:59Z';

    const { data: accounts, error } = await supabase
        .from('challenges')
        .select(`
            id,
            login,
            created_at,
            status,
            initial_balance,
            profiles (
                full_name,
                email
            )
        `)
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('❌ Error fetching accounts:', error.message);
        return;
    }

    if (accounts && accounts.length > 0) {
        console.log(`✅ Found ${accounts.length} accounts:`);
        accounts.forEach((acc: any) => {
            const profile = acc.profiles;
            console.log(`-----------------------------------`);
            console.log(`Login: ${acc.login}`);
            console.log(`Created: ${acc.created_at}`);
            console.log(`Status: ${acc.status}`);
            console.log(`Balance: ${acc.initial_balance}`);
            console.log(`User Name: ${profile?.full_name || 'N/A'}`);
            console.log(`User Email: ${profile?.email || 'N/A'}`);
        });
        console.log(`-----------------------------------`);
    } else {
        console.log('❌ No accounts found for April 3 and 4.');
    }
}

findAprilAccounts();
