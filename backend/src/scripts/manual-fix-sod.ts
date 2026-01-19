
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

async function fixSod() {
    const LOGIN = 889224326;
    console.log(`Fixing SOD Equity for account ${LOGIN}...`);

    // 1. Get Current Equity
    const { data: challenge, error: cError } = await supabase
        .from('challenges')
        .select('id, current_equity')
        .eq('login', LOGIN)
        .single();

    if (cError) {
        console.error('Error fetching challenge:', cError);
        return;
    }

    const currentEquity = challenge.current_equity;
    console.log(`Setting SOD Equity to Current Equity: ${currentEquity}`);

    // 2. Update SOD
    const { error: uError } = await supabase
        .from('challenges')
        .update({ start_of_day_equity: currentEquity })
        .eq('id', challenge.id);

    if (uError) {
        console.error('Error updating SOD:', uError);
    } else {
        console.log('✅ Successfully updated Start Of Day Equity!');
    }
}

fixSod();
