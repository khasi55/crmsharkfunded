
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

const sql = `
-- Add permissions column to admin_users table
ALTER TABLE public.admin_users 
ADD COLUMN IF NOT EXISTS permissions text[] DEFAULT '{}';

-- Create an index for faster lookups (optional but good practice)
CREATE INDEX IF NOT EXISTS idx_admin_users_permissions ON public.admin_users USING GIN (permissions);
`;

async function runMigration() {
    console.log("Attempting to run migration via RPC 'exec_sql'...");

    // Try to call a common RPC function for SQL execution if it exists
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
        console.error("❌ RPC 'exec_sql' failed:", error.message);
        console.log("Checking if we can create the function first (requires valid connection elsewhere)...");
        // If we can't run SQL, we can't create the function. 
        // We will try another common name or just fail gracefully.
        const { data: data2, error: error2 } = await supabase.rpc('run_sql', { sql: sql });
        if (error2) {
            console.error("❌ RPC 'run_sql' failed:", error2.message);
            console.log("SKIPPING MIGRATION: Please run the SQL manually in Supabase Dashboard SQL Editor.");
            console.log("SQL TO RUN:\n", sql);
        } else {
            console.log("✅ Migration successful via 'run_sql'.");
        }
    } else {
        console.log("✅ Migration successful via 'exec_sql'.");
    }
}

runMigration();
