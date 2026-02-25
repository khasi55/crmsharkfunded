
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkColumnTypes() {
    console.log('🔍 Checking column types for "trades" table...\n');

    // Query information_schema
    const { data: colInfo, error } = await supabase.rpc('get_table_columns', { table_name: 'trades' });

    if (error) {
        console.error('Error fetching via RPC:', error.message);

        // Fallback: Use raw SQL if we have a way, or just check the first row carefully
        const { data: firstRows } = await supabase.from('trades').select('*').limit(5);
        if (firstRows && firstRows.length > 0) {
            console.log('Sample Data Types:');
            const sample = firstRows[0];
            for (const key of Object.keys(sample)) {
                console.log(`${key}: ${typeof sample[key]} (Value: ${sample[key]})`);
            }
        }
    } else {
        console.log('Column Information:');
        console.log(JSON.stringify(colInfo, null, 2));
    }
}

checkColumnTypes();
