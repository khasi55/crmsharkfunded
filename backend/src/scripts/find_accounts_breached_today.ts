import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function main() {
    console.log('Querying breached accounts for today...');
    
    // Get today's date in UTC (start of day)
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const todayStr = today.toISOString();

    const { data: challenges, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('status', 'failed') // assuming 'failed' or similar status for breached
        .gte('updated_at', todayStr);

    if (error) {
        console.error('Error fetching challenges:', error.message);
        return;
    }

    console.log(`Challenges with status=failed updated today: ${challenges.length}`);
    
    // Also try to find a specific breach table or status log
    const { data: breachLogs, error: logErr } = await supabase
        .from('risk_events') // Common audit log for breaches
        .select('*')
        .in('event_type', ['breach_daily', 'breach_max', 'breach'])
        .gte('created_at', todayStr);
        
    if (!logErr && breachLogs) {
        console.log(`Breach events logged today in risk_events: ${breachLogs.length}`);
    } else if (logErr) {
        // Maybe the table is named differently or doesn't exist
    }

    const { data: accounts, error: accErr } = await supabase
        .from('accounts') // If there's a standalone accounts table
        .select('*')
        .eq('status', 'breached')
        .gte('updated_at', todayStr);

    if (!accErr && accounts) {
        console.log(`Accounts table with status=breached updated today: ${accounts.length}`);
    }
}

main().catch(console.error);
