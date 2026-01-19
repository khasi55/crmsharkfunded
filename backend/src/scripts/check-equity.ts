
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

async function checkEquity() {
    console.log("Checking Equity for account 889224326...");
    const { data: challenge, error } = await supabase
        .from('challenges')
        .select('id, login, current_equity, initial_balance, start_of_day_equity')
        .eq('login', 889224326)
        .single();

    if (error) {
        console.error('Error fetching challenge:', error);
        return;
    }

    console.log(`Account: ${challenge.login}`);
    console.log(`Initial Balance: ${challenge.initial_balance}`);
    console.log(`Current Equity: ${challenge.current_equity}`);
    console.log(`Start Of Day: ${challenge.start_of_day_equity}`);

    const equity = Number(challenge.current_equity);
    const initial = Number(challenge.initial_balance);

    if (equity > initial) {
        console.log("✅ Equity is updated (Profit verified)");
    } else {
        console.log("⚠️ Equity is still at/below Initial. (Wait for Risk Scheduler)");
    }
}

checkEquity();
