
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkUsersList() {
    console.log("Checking 'userslist' table...");
    const { data, error } = await supabase
        .from('userslist')
        .select('*')
        .limit(1);

    if (error) {
        console.error("❌ 'userslist' error:", error);
    } else {
        console.log("✅ 'userslist' exists. First row:", data);
    }
}

checkUsersList();
