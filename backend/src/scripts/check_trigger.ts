import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function main() {
    console.log("Fetching trigger definition...");
    const { data: qData, error: qError } = await supabase.rpc('execute_sql', { query: `SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'handle_new_user';` });
    if (qError) {
        console.error("Error fetching trigger with execute_sql:", qError.message);
    } else {
        console.log(qData);
    }
}
main();
