
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from backend root
dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEquityReset() {
    const LOGIN = 889224326;
    console.log(`Checking SOD Equity for account ${LOGIN}...`);

    // 1. Get Challenge
    const { data: challenge, error: cError } = await supabase
        .from('challenges')
        .select('id, login, current_equity, initial_balance, start_of_day_equity, updated_at')
        .eq('login', LOGIN)
        .single();

    if (cError) {
        console.error('Error fetching challenge:', cError);
        return;
    }

    console.log(`Current Equity: ${challenge.current_equity}`);
    console.log(`Start Of Day:   ${challenge.start_of_day_equity}`);
    console.log(`Last Updated:   ${challenge.updated_at}`);

    if (Number(challenge.start_of_day_equity) < Number(challenge.current_equity)) {
        console.log("⚠️ SOD < Current. If no trades today, this means Reset FAILED.");
    } else {
        console.log("✅ SOD >= Current (or equal). Reset likely happened.");
    }
}

checkEquityReset();
