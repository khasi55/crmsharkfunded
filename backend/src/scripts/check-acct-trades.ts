import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkAccountTrades() {
    console.log("Fetching trades count for 900909495203...");
    const { data: challenge } = await supabase.from('challenges').select('id, login').eq('login', 900909495203).single();
    if (!challenge) {
        console.log("Account not found");
        return;
    }

    console.log("Challenge ID:", challenge.id);

    const { count, error } = await supabase
        .from('trades')
        .select('*', { count: 'exact', head: true })
        .eq('challenge_id', challenge.id);

    console.log(`Total trades in DB: ${count}`);
}

checkAccountTrades();
