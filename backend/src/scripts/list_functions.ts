import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function check() {
    console.log('Listing all functions (RPCs) in the public schema...');
    const { data: functions, error } = await supabase.rpc('get_functions_debug_v2');

    if (error) {
        console.warn('RPC get_functions_debug_v2 failed. Trying alternative query...');
        // Try a raw query if possible, but usually we can't.
        // Let's try to query pg_proc via a generic RPC if one exists.
        const { data: rawFuncs, error: rawError } = await supabase
            .from('pg_proc')
            .select('proname')
            .limit(10);
        if (rawError) {
            console.error("Could not list functions. Error:", rawError.message);
        } else {
            console.log("Functions snippet:", rawFuncs);
        }
    } else {
        console.log("Functions found:", functions);
    }
}
check();
