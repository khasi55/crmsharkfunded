
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkSchema() {
    console.log("Checking `wallet_addresses` schema via sample...");
    const { data, error } = await supabase
        .from('wallet_addresses')
        .select('*')
        .limit(1);

    if (error) {
        console.error("❌ Error fetching sample:", error);
    } else if (data && data.length > 0) {
        console.log("✅ Sample Found:", data[0]);
        const keys = Object.keys(data[0]);
        console.log("   Keys:", keys);
        // We can't see the types directly via JS client usually, but seeing the keys and values will confirm UUID format
    } else {
        console.log("⚠️ Table empty, checking via insert attempt or just rely on error message");
    }
}

checkSchema();
