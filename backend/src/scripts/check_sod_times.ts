import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkTimestamps() {
    const { data: challenges, error } = await supabase.from('challenges')
        .select('login, start_of_day_equity, updated_at')
        .eq('status', 'active')
        .order('updated_at', { ascending: false })
        .limit(20);

    if (error || !challenges) {
        console.log("No active challenges or error:", error);
        return;
    }

    console.log(`Latest updated active accounts:`);
    challenges.forEach((c) => {
        console.log(`Login: ${c.login} | SOD: ${c.start_of_day_equity} | Updated At: ${new Date(c.updated_at).toLocaleString()}`);
    });
}
checkTimestamps();
