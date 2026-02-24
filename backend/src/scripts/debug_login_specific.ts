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

async function checkDailyDd() {
    const LOGIN = '900909493018';

    // 1. Get Challenge
    const { data: c, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('login', LOGIN)
        .single();

    if (error || !c) {
        console.error('Error fetching challenge:', error);
        return;
    }

    console.log(`\n📊 Status for ${LOGIN}`);
    console.log(JSON.stringify(c, null, 2));
}

checkDailyDd();
