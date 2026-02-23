import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("Fetching one row from admin_users...");
    const { data, error } = await supabase.from('admin_users').select('*').limit(1);

    if (error) {
        console.error("Error:", error);
    } else if (data && data.length > 0) {
        console.log("Columns:", Object.keys(data[0]).join(', '));
    } else {
        console.log("Table is empty, trying to insert a dummy or get schema via RPC if possible. But better yet, just fetch a row if one exists.");
        // let's try to get column names from information_schema if possible via RPC? Supabase REST API doesn't expose information_schema directly easily without RPC.
    }
}

main();
