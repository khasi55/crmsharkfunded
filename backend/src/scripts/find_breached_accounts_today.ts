import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function main() {
    console.log('Querying breached accounts for today (since midnight local time)...');
    
    // Assuming local timezone or just past 24 hours
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Midnight local time
    const todayStr = today.toISOString();

    const { data: challenges, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('status', 'breached') // let's check for breached status
        .gte('updated_at', todayStr);

    if (error) {
        console.error('Error fetching challenges:', error.message);
    } else {
        console.log(`Challenges with status=breached updated since midnight: ${challenges.length}`);
    }
    
    const { data: challengesFailed, error: failErr } = await supabase
        .from('challenges')
        .select('*')
        .eq('status', 'failed') // sometimes breached is marked as failed
        .gte('updated_at', todayStr);

    if (!failErr && challengesFailed) {
        console.log(`Challenges with status=failed updated since midnight: ${challengesFailed.length}`);
    }
}

main().catch(console.error);
