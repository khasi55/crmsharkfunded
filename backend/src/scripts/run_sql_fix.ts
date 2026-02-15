
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
    const sqlPath = path.resolve(__dirname, '../../sql/fix_coupon_validation_ci.sql');
    console.log(`Executing SQL from: ${sqlPath}`);

    try {
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // We can't run raw SQL directly with supabase-js easily unless we use a workaround
        // or if there is a 'exec_sql' RPC.
        // Assuming we DO NOT have exec_sql, we might need to use pg directly OR 
        // rely on the user having a way to run it.
        // BUT, since we have been modifying TS files, maybe I can use the same pattern as "show_fix_sql.ts" 
        // or just print it for the user if I can't run it?

        // Actually, looking at previous tools, I don't see a "run_sql" tool.
        // I'll try to use a postgres client if available, or just use the `pg` library if installed.
        // Checking package.json would be good, but I assume `pg` or similar is there.
        // Let's check if we can simply use the `postgres` library or if I should just use `psql` command.
        // The user has `npm run dev`.

        // I will try to use `psql` via `run_command` if I can connection string.
        // But better: I will create a PG connection using the env var DATABASE_URL if it exists.

        console.log('SQL Content Length:', sql.length);

        // Let's use the `postgres` package if available, typically installed in backend.
        // Or `pg`.

        const { Client } = require('pg');
        const dbUrl = process.env.DATABASE_URL;

        if (!dbUrl) {
            console.error('DATABASE_URL not found in .env');
            return;
        }

        const client = new Client({
            connectionString: dbUrl,
            ssl: { rejectUnauthorized: false }
        });

        await client.connect();
        await client.query(sql);
        await client.end();

        console.log('✅ SQL executed successfully.');

    } catch (e) {
        console.error('Error executing SQL:', e);
    }
}

main().catch(console.error);
