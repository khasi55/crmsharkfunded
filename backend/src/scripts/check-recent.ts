
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) { process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRecent() {
    console.log("Fetching 5 most recent active challenges...");
    const { data: challenges, error } = await supabase
        .from('challenges')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) { console.error(error); return; }

    for (const c of challenges) {
        const { count } = await supabase
            .from('trades')
            .select('*', { count: 'exact', head: true })
            .eq('challenge_id', c.id);

        console.log(`\nlogin: ${c.login} | Created: ${c.created_at}`);
        console.log(`Initial: ${c.initial_balance} | Current: ${c.current_equity} | SOD: ${c.start_of_day_equity}`);
        console.log(`Trades Count: ${count}`);
    }
}

checkRecent();
