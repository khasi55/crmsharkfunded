
import { Client } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load env from .env file explicitly
dotenv.config({ path: path.resolve(__dirname, '.env') });

console.log("DEBUG: DATABASE_URL length:", process.env.DATABASE_URL ? process.env.DATABASE_URL.length : 0);
console.log("DEBUG: SUPABASE_DB_URL length:", process.env.SUPABASE_DB_URL ? process.env.SUPABASE_DB_URL.length : 0);

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || process.env.POSTGRES_URL;

if (!connectionString) {
    console.error("Missing Database Connection String (DATABASE_URL)");
    process.exit(1);
}

const sql = `
-- Add permissions column to admin_users table
ALTER TABLE public.admin_users 
ADD COLUMN IF NOT EXISTS permissions text[] DEFAULT '{}';

-- Create an index for faster lookups (optional but good practice)
CREATE INDEX IF NOT EXISTS idx_admin_users_permissions ON public.admin_users USING GIN (permissions);
`;

async function runMigration() {
    const client = new Client({
        connectionString: connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("Connected to Database.");
        console.log("Running migration SQL...");
        await client.query(sql);
        console.log("✅ Migration successful: permissions column added.");
    } catch (err) {
        console.error("❌ Migration failed:", err);
    } finally {
        await client.end();
    }
}

runMigration();
