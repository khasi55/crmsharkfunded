
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkTriggers() {
    console.log('Checking triggers for kyc_sessions...');
    const { data, error } = await supabase.rpc('get_table_triggers', { t_name: 'kyc_sessions' });

    // If RPC doesn't exist, try a raw query via a temporary function if possible, 
    // but usually we can't do raw SQL via supabase-js unless using an RPC.

    // Let's try to just list all session data again to see if it's even readable.
    console.log('Checking readability...');
    const start = Date.now();
    const { data: readData, error: readError } = await supabase.from('kyc_sessions').select('count', { count: 'exact', head: true });
    console.log(`Read count in ${Date.now() - start}ms:`, readError || readData);
}

checkTriggers();
