
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Load .env
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
    const { data, error } = await supabase
        .from('pg_tables')
        .select('tablename')
        .eq('schemaname', 'public');

    // pg_tables might not be accessible via the client directly if RLS/Permissions are tight.
    // Try a different approach if it fails.
    if (error) {
        console.log('Could not list tables via pg_tables, trying to fetch from common tables...');
        const commonTables = ['profiles', 'challenges', 'orders', 'payouts', 'transactions', 'accounts', 'withdrawals', 'affiliates'];
        for (const table of commonTables) {
            const { error: tError } = await supabase.from(table).select('*').limit(1);
            if (!tError) console.log(`Table exists: ${table}`);
        }
    } else {
        data.forEach(t => console.log(`Table: ${t.tablename}`));
    }
}

listTables();
