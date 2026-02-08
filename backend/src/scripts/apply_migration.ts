
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// Construct connection string
// Prefer DIRECT connection for DDL, but pooler is fine for simple alter
const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

if (!connectionString) {
    console.error("Missing DATABASE_URL or SUPABASE_DB_URL in .env");
    process.exit(1);
}

async function runMigration() {
    console.log("🔌 Connecting to database...");
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false } // Required for Supabase in many cases
    });

    try {
        await client.connect();
        console.log("✅ Connected.");

        const migrationPath = path.join(__dirname, '../../supabase/migrations/20260209_allow_monitor_severity.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        console.log("🔄 Executing migration:", migrationPath);
        console.log("---------------------------------------------------");
        console.log(sql);
        console.log("---------------------------------------------------");

        await client.query(sql);
        console.log("✅ Migration applied successfully!");

    } catch (err: any) {
        console.error("❌ Migration failed:", err.message);
    } finally {
        await client.end();
    }
}

runMigration();
