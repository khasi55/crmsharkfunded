import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function check() {
    console.log('Fetching account_types content...');
    const { data, error } = await supabase.from('account_types').select('*');
    if (error) {
        console.error("Error fetching account_types:", error);
    } else {
        console.log("Account Types:", JSON.stringify(data, null, 2));
    }
}
check();
