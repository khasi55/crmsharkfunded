
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log('Fetching profiles schema...');

    // Fetch a single row to see the keys
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error:', error);
    } else if (data && data.length > 0) {
        console.log('Columns found:', Object.keys(data[0]));
    } else {
        console.log('Table is empty, cannot infer columns from data.');

        // Try selecting specifically metadata to see if it throws
        const { error: metaError } = await supabase.from('profiles').select('metadata').limit(1);
        if (metaError) {
            console.log('Confirmed: "metadata" column error:', metaError.message);
        } else {
            console.log('Wait, "metadata" column seems to exist but table is empty.');
        }
    }
}

main();
