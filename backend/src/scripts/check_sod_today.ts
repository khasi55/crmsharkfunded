import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function check() {
    const { data: challenges } = await supabase.from('challenges')
        .select('login, initial_balance, start_of_day_equity, current_equity, status')
        .eq('status', 'active');

    if (!challenges) {
        console.log("No active challenges.");
        return;
    }

    let sodMatchesInitial = 0;
    let sodMatchesCurrent = 0;
    let sodIsDifferent = 0;

    for (const c of challenges) {
        if (Math.abs(c.start_of_day_equity - c.initial_balance) < 0.01) {
            sodMatchesInitial++;
        } else if (Math.abs(c.start_of_day_equity - c.current_equity) < 0.01) {
            sodMatchesCurrent++;
        } else {
            sodIsDifferent++;
        }
    }

    console.log(`Total Active: ${challenges.length}`);
    console.log(`Accounts where SOD == Initial Balance (new or never reset that moved): ${sodMatchesInitial}`);
    console.log(`Accounts where SOD == Current Equity (no trades today): ${sodMatchesCurrent}`);
    console.log(`Accounts where SOD != Initial & SOD != Current (traded today and SOD reflects yesterday's close): ${sodIsDifferent}`);
}
check();
