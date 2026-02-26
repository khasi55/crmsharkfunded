import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function main() {
    console.log('Fetching recent email service errors from system_logs...');

    const { data: logs, error } = await supabase
        .from('system_logs')
        .select('*')
        .eq('source', 'EmailService')
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error('Error fetching logs:', error.message);
    } else if (!logs || logs.length === 0) {
        console.log('No email service errors found in logs.');
    } else {
        console.log('RECENT_EMAIL_ERRORS:');
        logs.forEach(log => {
            console.log(`[${log.created_at}] ${log.message}`);
            if (log.details) {
                console.log(`   Details: ${JSON.stringify(log.details)}`);
            }
        });
    }
}

main();
