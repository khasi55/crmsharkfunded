import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function main() {
    console.log('Fetching recent security events from system_logs...');

    const { data: logs, error } = await supabase
        .from('system_logs')
        .select('*')
        .eq('source', 'SecurityLogger')
        .contains('details', { action: 'REQUEST_FINANCIAL_OTP' })
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error('Error fetching logs:', error.message);
    } else {
        console.log('RECENT_OTP_REQUESTS:');
        logs?.forEach(log => {
            console.log(`[${log.created_at}] ${log.details.status} - ${log.details.email} (${log.details.resource})`);
            if (log.details.error_message) {
                console.log(`   Error: ${log.details.error_message}`);
            }
        });
    }
}

main();
