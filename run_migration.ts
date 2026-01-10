
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load env from backend/.env
dotenv.config({ path: path.join(__dirname, 'backend', '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
    try {
        console.log("Running migration...");
        // Since we can't easily run raw SQL via the JS client without specific RPCs or direct connection, 
        // and I don't have direct DB access working, I will try to use the `rpc` if available, 
        // OR simply verify if I can just use the provided credentials to connect via a pg client if I had one.
        // BUT, for now, let's assume the user has the 'postgres' package or similar.

        // Wait, I see I don't have 'pg' installed in the package.json checks earlier.
        // Actually, if I cannot run SQL directly, I might need to ask the user or use a workaround.
        // However, I can try to use a Supabase RPC function if one exists for running SQL.
        // If not, I will try to use the `pg` driver if it's in node_modules (usually is with supabase).

        // Let's try a different approach. I will simply use the "postgres" library if available.
        // If not, I'll log a warning and ask the user to run it.

        // Actually, let's look at the `backend/package.json` to see dependencies.

        const { error } = await supabase.rpc('exec_sql', {
            sql_query: `
            ALTER TABLE competitions 
            ADD COLUMN IF NOT EXISTS initial_balance DECIMAL(15, 2) DEFAULT 100000;
        ` });

        if (error) {
            // If RPC fails (likely does not exist), I will try one more thing or just notify user.
            console.error("RPC exec_sql failed:", error);
            console.log("Attempting to continue... please ensure the column 'initial_balance' is added to 'competitions'.");
        } else {
            console.log("Migration successful via RPC!");
        }

    } catch (e) {
        console.error("Migration script error:", e);
    }
}

runMigration();
