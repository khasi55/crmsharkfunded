
import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

if (!connectionString) {
    console.error('Missing DATABASE_URL or SUPABASE_DB_URL');
    process.exit(1);
}

const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        await client.connect();
        console.log('Connected to database.');

        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS event_entry_passes (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                code VARCHAR(255) NOT NULL UNIQUE,
                event_slug VARCHAR(255) NOT NULL,
                attendee_name VARCHAR(255) NOT NULL,
                attendee_email VARCHAR(255) NOT NULL,
                is_used BOOLEAN DEFAULT FALSE,
                used_at TIMESTAMP WITH TIME ZONE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `;

        await client.query(createTableQuery);
        console.log('✅ Table event_entry_passes created successfully.');

        // Add index on code for faster lookups
        await client.query(`CREATE INDEX IF NOT EXISTS idx_event_entry_passes_code ON event_entry_passes(code);`);
        console.log('✅ Index on code created.');

    } catch (error) {
        console.error('Error creating table:', error);
    } finally {
        await client.end();
    }
}

run();
