import { supabase } from '../lib/supabase';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const loginId = process.argv[2] || '900909494245';

async function searchLogs() {
    console.log(`Searching system logs for "${loginId}"...`);
    try {
        const { data: logs, error } = await supabase
            .from('system_logs')
            .select('*')
            .ilike('message', `%${loginId}%`)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching logs:', error.message);
            return;
        }

        console.log(`Found ${logs?.length} log entries.\n`);
        logs?.forEach(l => {
            console.log(`[${l.created_at}] ${l.source} ${l.level}: ${l.message}`);
            if (l.details) {
                console.log('Details:', JSON.stringify(l.details, null, 2));
            }
            console.log('---');
        });

    } catch (e: any) {
        console.error('Failed:', e.message);
    }
}

searchLogs();
