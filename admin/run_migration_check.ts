import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from backend
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("Running migration for admin_users tracking...");

    // We use RPC if available, or just raw query if handled by Supabase REST (unlikely for DDL)
    // For DDL, we often need to use a function or just hope the table check works.
    // However, I can try to use the REST API to see if columns exist by selecting them.

    // Better way: Use the 'postgres' extension or similar if available, or just select to check.
    // Since I can't run raw SQL directly via standard Supabase client without a proxy function,
    // I will try to see if I can use a generic 'rpc' call if there's one for SQL execution.

    // If no RPC, I'll just skip to updating the code and assume the columns exist or are added manually by the user if I can't.
    // BUT, I can try to check if the columns exist by trying a select.

    const { data: check, error: checkError } = await supabase
        .from('admin_users')
        .select('last_seen, daily_login_count, last_login_date')
        .limit(1);

    if (checkError && checkError.code === '42703') {
        console.log("Columns missing. Please run the following SQL in Supabase SQL Editor:");
        console.log(`
ALTER TABLE public.admin_users 
ADD COLUMN IF NOT EXISTS last_seen timestamp with time zone,
ADD COLUMN IF NOT EXISTS daily_login_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_login_date date;
UPDATE public.admin_users SET last_login_date = CURRENT_DATE WHERE last_login_date IS NULL;
        `);
    } else if (checkError) {
        console.error("Error checking columns:", checkError);
    } else {
        console.log("Columns already exist.");
    }
}

main();
