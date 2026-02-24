import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkTradesSchema() {
    const { data, error } = await supabase.from('trades').select('*').limit(1);
    if (error) {
        console.error("Error fetching trades:", error);
    } else if (data && data.length > 0) {
        console.log("Trades Table Columns:", Object.keys(data[0]));
    } else {
        console.log("No data in trades table. Attempting to insert a dummy row to get schema error...");
        const { error: insertErr } = await supabase.from('trades').insert([{ challenge_id: '00000000-0000-0000-0000-000000000000' }]);
        console.log("Insert Error (might reveal columns):", insertErr);
    }
}

checkTradesSchema();
