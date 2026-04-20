import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function check() {
    console.log('Listing all keys in pricing_configurations...');
    const { data, error } = await supabase.from('pricing_configurations').select('key, updated_at');
    if (error) {
        console.error("Error:", error.message);
    } else {
        console.log("Keys Found:", JSON.stringify(data, null, 2));
    }
}
check();
