const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../backend/.env' });
const supabase = createClient(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
    let { data, error } = await supabase.rpc('execute_sql', { query: 'SELECT 1 AS test' });
    console.log("execute_sql result:", data, error);
    
    if (error) {
        let { data: d2, error: e2 } = await supabase.rpc('run_sql', { sql: 'SELECT 1 AS test' });
        console.log("run_sql result:", d2, e2);
    }
}
run();
