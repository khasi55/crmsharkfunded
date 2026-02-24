
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function findAccount() {
    console.log("🔍 Searching for account with suspicious equity limits...");

    const { data: challenges, error } = await supabase
        .from('challenges')
        .select('*')
        .or('current_equity.eq.4513.54,start_of_day_equity.eq.4513.54,current_equity.lte.4600');

    if (error) {
        console.error("Error:", error);
        return;
    }

    console.log(`Found ${challenges?.length || 0} candidates.`);

    challenges?.forEach(c => {
        console.log(`\nLogin: ${c.login} | ID: ${c.id}`);
        console.log(`Type: ${c.challenge_type} | Group: ${c.group}`);
        console.log(`Initial: ${c.initial_balance} | SOD: ${c.start_of_day_equity}`);
        console.log(`Equity: ${c.current_equity} | Balance: ${c.current_balance}`);
    });
}

findAccount();
