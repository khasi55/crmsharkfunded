import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function search() {
    const login = 900909609723;
    console.log(`Searching for login ${login}...`);

    for (const table of ['challenges', 'orders', 'payment_orders', 'profiles']) {
        let query = supabase.from(table).select('*');
        
        if (table === 'profiles') {
            // Profiles might have it in metadata or something?
            query = query.or(`first_name.ilike.%${login}%,last_name.ilike.%${login}%`);
        } else {
            // Check common columns
            const columns = ['login', 'account_login', 'mt5_login'];
            // We don't know exactly which columns exist, so we'll try one by one or catch error
        }
        
        // Actually, just try to find if ANY row in challenges has this login
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (data && data.length > 0) {
            const cols = Object.keys(data[0]);
            const loginCol = cols.find(c => c.includes('login'));
            if (loginCol) {
                const { data: found } = await supabase.from(table).select('*').eq(loginCol, login);
                if (found && found.length > 0) {
                    console.log(`Found in table ${table}, column ${loginCol}:`, found);
                }
            }
        }
    }
}

search();
