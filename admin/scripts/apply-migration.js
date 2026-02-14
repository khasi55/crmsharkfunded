const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function applyMigration() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const migrationPath = path.join(__dirname, 'admin_2fa_migration.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log("Applying migration...");

    // Supabase JS client doesn't have a direct 'run sql' method unless using a RPC or extension
    // But we can try to use the verify_admin_credentials trick if we had one that ran raw SQL
    // Actually, usually migrations are run via the SQL editor or CLI.
    // If I can't run it via code, I'll inform the user.

    console.log("Please run the following SQL in your Supabase SQL Editor:");
    console.log("---------------------------------------------------------");
    console.log(sql);
    console.log("---------------------------------------------------------");
}

applyMigration();
