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

async function findUuid() {
    const LOGIN = '900909493018';
    const { data, error } = await supabase
        .from('challenges')
        .select('id, login, initial_balance, current_equity, start_of_day_equity')
        .eq('login', LOGIN)
        .single();

    if (error || !data) {
        console.error('Error:', error);
        return;
    }
    console.log(JSON.stringify(data, null, 2));
}

findUuid();
