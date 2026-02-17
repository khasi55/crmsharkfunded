
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
    const sqlFile = path.resolve(__dirname, 'add_metadata_to_profiles.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    console.log("🚀 Running migration: Add metadata column to profiles...");

    const { error } = await supabase.rpc('exec_sql', { sql });

    if (error) {
        console.error("❌ Error applying migration:", error.message);
        console.log("\nIf 'exec_sql' RPC is missing, please run this SQL manually in Supabase SQL Editor:");
        console.log(sql);
        process.exit(1);
    }

    console.log("✅ Migration applied successfully!");
}

runMigration();
