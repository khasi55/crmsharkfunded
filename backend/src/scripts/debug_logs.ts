import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) { process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLogs() {
    const { data } = await supabase.from('system_logs').select('*').or('message.ilike.%SF1772283405%,details->>orderId.ilike.%SF1772283405%').order('created_at', { ascending: false }).limit(20);
    console.log('Logs:', JSON.stringify(data, null, 2));
}
checkLogs();
