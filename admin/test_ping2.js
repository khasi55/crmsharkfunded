const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../backend/.env' });
const supabase = createClient(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
    console.log("Pinging Supabase...");
    const { data, error } = await supabase.from('profiles').select('id').limit(1);
    console.log("Ping result:", data ? "Success" : "Failed", error);
}
run();
