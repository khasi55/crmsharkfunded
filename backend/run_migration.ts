
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load env from .env in current dir (backend)
dotenv.config();

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

        const sqlPath = path.join(__dirname, 'sql', 'create_admin_risk_dashboard.sql');
        console.log("Reading SQL from:", sqlPath);
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');

        // Try RPC
        const { error } = await supabase.rpc('exec_sql', {
            sql_query: sqlContent
        });

        if (error) {
            console.error("RPC exec_sql failed:", error);
            console.log("Attempting second method: explicit SQL via text (if enabled)...");
        } else {
            console.log("Migration successful via RPC!");
            return;
        }

    } catch (e) {
        console.error("Migration script error:", e);
    }
}

runMigration();
