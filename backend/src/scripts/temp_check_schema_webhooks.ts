import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("Checking columns for webhook_logs...");
    const { data: cols, error } = await supabase.rpc('get_table_columns', { table_name: 'webhook_logs' });
    
    if (error) {
        // Fallback: try to fetch one row
        const { data: row, error: rowError } = await supabase.from('webhook_logs').select('*').limit(1);
        if (row && row.length > 0) {
            console.log('Columns found in first row:', Object.keys(row[0]));
        } else {
            console.error('Error fetching table info:', rowError || 'Table is empty');
        }
    } else {
        console.log('Columns:', cols);
    }
}

main();
