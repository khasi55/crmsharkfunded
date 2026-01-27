
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function main() {
    const login = '889224700';
    console.log(`Unbreaching account: ${login}`);

    // 1. Get Current State
    const { data: challenge } = await supabase
        .from('challenges')
        .select('*')
        .eq('login', login)
        .single();

    if (!challenge) {
        console.error('Challenge not found');
        return;
    }

    console.log('Current State:', {
        status: challenge.status,
        equity: challenge.current_equity,
        sod: challenge.start_of_day_equity
    });

    // 2. Unbreach
    // We reset Start of Day Equity to Current Equity to clear the daily drawdown.
    // We keep the profit (High water mark).
    const { error } = await supabase
        .from('challenges')
        .update({
            status: 'active',
            start_of_day_equity: 100000,
            // Optional: Update simple metadata or logs if needed
        })
        .eq('login', login);

    if (error) {
        console.error('Error unbreaching:', error);
    } else {
        console.log('✅ Account unbreached successfully.');
        console.log(`Updated Start of Day Equity to: ${challenge.current_equity}`);
    }
}

main();
