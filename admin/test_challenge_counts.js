const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../backend/.env' });
const supabase = createClient(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log("Fetching challenge counts...");
    
    const [
        { count: total },
        { count: breached },
        { count: failed },
        { count: passed },
        { count: active }
    ] = await Promise.all([
        supabase.from('challenges').select('*', { count: 'exact', head: true }),
        supabase.from('challenges').select('*', { count: 'exact', head: true }).eq('status', 'breached'),
        supabase.from('challenges').select('*', { count: 'exact', head: true }).eq('status', 'failed'),
        supabase.from('challenges').select('*', { count: 'exact', head: true }).eq('status', 'passed'),
        supabase.from('challenges').select('*', { count: 'exact', head: true }).eq('status', 'active')
    ]);
    
    console.log(`Total: ${total}`);
    console.log(`Breached: ${breached}`);
    console.log(`Failed: ${failed}`);
    console.log(`Passed: ${passed}`);
    console.log(`Active: ${active}`);
}
run();
