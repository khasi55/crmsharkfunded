
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const login = '889224484';
    console.log(`Checking trades for login: ${login}`);

    // First get challenge_id
    const { data: challenge } = await supabase
        .from('challenges')
        .select('id')
        .eq('login', login)
        .single();

    if (!challenge) {
        console.log('Challenge not found');
        return;
    }

    const { data: trades, error } = await supabase
        .from('trades')
        .select('*')
        .eq('challenge_id', challenge.id)
        .order('open_time', { ascending: false })
        .limit(20);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Found ${trades?.length} trades`);
    console.log("----------------------------------------------------------------");
    console.log("| Ticket | Symbol | Type (Raw) | Lots | Profit | Open Time |");
    console.log("----------------------------------------------------------------");
    trades?.forEach(t => {
        console.log(`| ${t.ticket} | ${t.symbol} | ${t.type} (${typeof t.type}) | ${t.lots} | ${t.profit_loss} | ${t.open_time} |`);
    });
}

main();
