
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function runMigration() {
    console.log("Running migration to add allow_hedging and allow_martingale...");

    // Add allow_hedging
    const { error: error1 } = await supabase.rpc('exec_sql', {
        sql: `ALTER TABLE risk_rules_config ADD COLUMN IF NOT EXISTS allow_hedging BOOLEAN DEFAULT TRUE;`
    });

    if (error1) {
        // Fallback if rpc exec_sql not available (common in some setups), try direct query if possible or just log error
        console.error("Error adding allow_hedging (RPC method):", error1);
        // Alternate: Using raw SQL query via a dummy function if needed, but let's try this first.
    } else {
        console.log("✅ Added allow_hedging column.");
    }

    // Add allow_martingale
    const { error: error2 } = await supabase.rpc('exec_sql', {
        sql: `ALTER TABLE risk_rules_config ADD COLUMN IF NOT EXISTS allow_martingale BOOLEAN DEFAULT TRUE;`
    });

    if (error2) {
        console.error("Error adding allow_martingale (RPC method):", error2);
    } else {
        console.log("✅ Added allow_martingale column.");
    }
}

// Since RPC exec_sql is not standard, we might need to use a different approach if this fails.
// A better way for Supabase JS client migration if we don't have direct SQL access is creating a function 
// or using the dashboard. But I'll try to find a workaround if this specific RPC doesn't exist.
// Checking if there is a 'exec' function or similar.

// Actually, I can't run DDL via the JS client easily without a specific RPC. 
// I will try to use the `admin` API or just ask the user to run it if I can't.
// BUT, I can try to use the existing `bulk_execute_sql` or similar if it exists in their project.
// Let's assumme for now I can't run DDL easily.
// I will check if I can use the `pg` driver directly? No, I don't have DB credentials (host/pass), just URL/Key.

// STRATEGY CHANGE: 
// I will create a script that uses valid Supabase `postgres` function if available (often called `exec_sql`).
// If that fails, I'll have to ask the user to execute the SQL or use `run_command` with `psql` if available?
// The user Environment has `Supabase URL` and `Key`. 
// I'll try to use a standardized SQL execution if available.

runMigration();
