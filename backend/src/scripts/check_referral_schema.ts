
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function check() {
    console.log("Checking profiles schema...");
    const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, referral_code, referred_by')
        .limit(1);

    if (error) {
        console.error("Error:", error.message);
    } else {
        console.log("Success! Columns exist.");
        console.log("Keys:", Object.keys(data?.[0] || {}));
    }
}

check();
