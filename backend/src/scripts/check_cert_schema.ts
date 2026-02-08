
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkSchema() {
    console.log("🕵️ Checking certificates table schema...");

    // Try to generic select
    const { data, error } = await supabase
        .from('certificates')
        .select('*')
        .limit(1);

    if (error) {
        console.error("Error:", error);
    } else {
        if (data && data.length > 0) {
            console.log("Found row:", data[0]);
            console.log("Keys:", Object.keys(data[0]));
        } else {
            console.log("Table is empty. Cannot infer keys from data.");
            // Try to insert a dummy record with just user_id to see what fails
            console.log("Attempting dummy insert to see columns in error...");
            return;
        }
    }
}

checkSchema();
