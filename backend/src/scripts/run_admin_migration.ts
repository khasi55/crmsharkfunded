
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

async function runMigration() {
    try {
        await client.connect();

        console.log("Connected to database. Running migration...");

        const sql = `
            ALTER TABLE public.admin_users
            ADD COLUMN IF NOT EXISTS two_factor_secret text,
            ADD COLUMN IF NOT EXISTS is_two_factor_enabled boolean DEFAULT false,
            ADD COLUMN IF NOT EXISTS webauthn_credentials jsonb DEFAULT '[]'::jsonb,
            ADD COLUMN IF NOT EXISTS is_webauthn_enabled boolean DEFAULT false;
            
            COMMENT ON COLUMN public.admin_users.two_factor_secret IS 'Secret key for TOTP 2FA';
            COMMENT ON COLUMN public.admin_users.webauthn_credentials IS 'Array of WebAuthn credentials (FaceID/TouchID)';
        `;

        await client.query(sql);
        console.log("Migration successful!");

    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        await client.end();
    }
}

runMigration();
