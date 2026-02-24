import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    let dbQuery = supabase
        .from("challenges")
        .select("*", { count: "exact" })
        .eq("status", "passed")
        .or('challenge_type.ilike.%phase 1%,challenge_type.ilike.%phase 2%,challenge_type.ilike.%step 1%,challenge_type.ilike.%step 2%,challenge_type.ilike.%1_step%,challenge_type.ilike.%2_step%')
        .order("updated_at", { ascending: false });

    const { data: accounts, count, error } = await dbQuery;

    console.log("Error:", error?.message);
    console.log("Count:", count);
    console.log("Accounts returned:", accounts?.length);
}

main();
