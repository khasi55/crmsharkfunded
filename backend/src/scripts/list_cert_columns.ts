
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkColumns() {
    console.log("🕵️ Listing columns for 'certificates' table...");

    // Can't query information_schema directly via JS client usually, but let's try RPC if available, 
    // OR just try to insert a known bad record to get a helpful error message.

    const { error } = await supabase
        .from('certificates')
        .insert({ 'dummy_column': 'test' });

    if (error) {
        console.log("Error details (might show columns):", error);
    }
}

checkColumns();
