import { Client } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || process.env.POSTGRES_URL;

if (!connectionString) {
    console.error("❌ Missing Database Connection String (DATABASE_URL)");
    process.exit(1);
}

async function runMigration() {
    const client = new Client({
        connectionString: connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("🟢 Connected to Database.");

        const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260212_session_auth.sql');
        const sql = fs.readFileSync(sqlPath, 'utf-8');

        console.log("🚀 Running session_auth migration SQL...");
        await client.query(sql);
        console.log("✅ Migration successful: api_sessions table created.");

    } catch (err) {
        console.error("❌ Migration failed:", err);
    } finally {
        await client.end();
    }
}

runMigration();
