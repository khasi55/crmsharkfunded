
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function main() {
    const login = '889224671';
    const realBalance = 98047.00;
    const realEquity = 98047.00;

    console.log(`Checking account ${login} before update...`);
    const { data: before } = await supabase.from('challenges').select('current_balance, current_equity').eq('login', login).single();
    console.log('Before:', before);

    console.log(`Updating account ${login} to Balance: ${realBalance}, Equity: ${realEquity}...`);

    const { data, error } = await supabase
        .from('challenges')
        .update({
            current_balance: realBalance,
            current_equity: realEquity,
            updated_at: new Date().toISOString()
        })
        .eq('login', login)
        .select();

    if (error) {
        console.error('Error updating:', error);
        return;
    }

    if (!data || data.length === 0) {
        console.error('No data returned. Account might not exist?');
        return;
    }

    console.log('✅ Update Successful');
    console.log('New State:', data[0]);
}

main();
