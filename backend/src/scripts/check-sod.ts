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
    // 10000 initial balance, $755 profit.
    const { data: challenges, error } = await supabase.from('challenges').select('login, initial_balance, current_equity, start_of_day_equity, status').eq('initial_balance', 10000);

    if (challenges) {
        for (const c of challenges) {
            if (c.current_equity && Math.abs(c.current_equity - 10755.45) < 10) {
                console.log(`Found matching account! Login: ${c.login}, Equity: ${c.current_equity}, SOD Equity: ${c.start_of_day_equity}, Status: ${c.status}`);
            }
        }
    }
}
checkAccount();
