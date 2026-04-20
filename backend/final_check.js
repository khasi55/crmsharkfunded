
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

async function finalCheck() {
    const userId = '6ad33fbc-02bf-419c-b01b-6d3a19cdfe89'; // somashekharpaled01@gmail.com
    const tables = ['challenges', 'orders', 'payouts', 'transactions', 'withdrawals', 'affiliates', 'notifications'];

    console.log(`Checking all tables for user ID: ${userId}`);

    for (const table of tables) {
        try {
            const { count, error } = await supabase
                .from(table)
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId);

            if (error) {
                // Ignore if table doesn't exist
                if (error.code !== 'PGRST116') {
                    // console.error(`Error checking ${table}:`, error.message);
                }
            } else {
                console.log(`${table}: ${count}`);
            }
        } catch (e) {
            // console.error(`Exception checking ${table}`);
        }
    }
}

finalCheck();
