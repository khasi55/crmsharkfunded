
import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error("Missing DATABASE_URL");
    process.exit(1);
}

const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

async function runNotificationMigration() {
    try {
        await client.connect();

        console.log("Connected to database. Running notification migration...");

        const sql = `
            ALTER TABLE public.notifications
            ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;
            
            COMMENT ON COLUMN public.notifications.metadata IS 'Extra data for notifications (e.g. action links, ref IDs)';
        `;

        await client.query(sql);
        console.log("✅ Notification migration successful!");

    } catch (err) {
        console.error("❌ Migration failed:", err);
    } finally {
        await client.end();
    }
}

runNotificationMigration();
