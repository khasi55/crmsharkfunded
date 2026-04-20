
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function main() {
    const login = '900909506842';
    const realBalance = 5030.17;
    const realEquity = 5030.17;
    const realSodEquity = 5030.17;

    console.log(`Checking account ${login} before update...`);
    const { data: before, error: fetchError } = await supabase
        .from('challenges')
        .select('current_balance, current_equity, start_of_day_equity')
        .eq('login', login)
        .maybeSingle();

    if (fetchError) {
        console.error('Error fetching account:', fetchError);
        return;
    }

    if (!before) {
        console.error('Account not found with login:', login);
        return;
    }

    console.log('Before:', before);

    console.log(`Updating account ${login} to Balance: ${realBalance}, Equity: ${realEquity}, SOD Equity: ${realSodEquity}...`);

    const { data, error } = await supabase
        .from('challenges')
        .update({
            current_balance: realBalance,
            current_equity: realEquity,
            start_of_day_equity: realSodEquity,
            updated_at: new Date().toISOString()
        })
        .eq('login', login)
        .select();

    if (error) {
        console.error('Error updating:', error);
        return;
    }

    if (!data || data.length === 0) {
        console.error('No data returned from update.');
        return;
    }

    console.log('✅ Update Successful');
    console.log('New State:', {
        current_balance: data[0].current_balance,
        current_equity: data[0].current_equity,
        start_of_day_equity: data[0].start_of_day_equity
    });
}

main().catch(console.error);
