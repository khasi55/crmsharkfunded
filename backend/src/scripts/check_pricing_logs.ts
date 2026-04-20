import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function check() {
    console.log('Fetching system_logs for pricing updates...');
    const { data, error } = await supabase
        .from('system_logs')
        .select('*')
        .ilike('message', '%Pricing%')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error:", error.message);
    } else {
        console.log("Logs Found:", JSON.stringify(data, null, 2));
    }
}
check();
