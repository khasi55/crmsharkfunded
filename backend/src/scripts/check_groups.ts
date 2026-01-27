
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function main() {
    const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .limit(1);

    if (error) { console.error(error); return; }
    if (data.length > 0) {
        console.log('Keys:', Object.keys(data[0]));
        console.log('Sample Row:', data[0]);
    } else {
        console.log('No data found');
    }
}
main();
