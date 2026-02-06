
import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('Missing DATABASE_URL in .env');
    process.exit(1);
}

const client = new Client({
    connectionString,
});

async function initDB() {
    try {
        await client.connect();
        console.log('Connected to database.');

        // Create notifications table
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS public.notifications (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'error', 'success', 'payout', 'kyc', 'risk')),
                read BOOLEAN DEFAULT FALSE,
                user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, 
                created_at TIMESTAMPTZ DEFAULT NOW(),
                metadata JSONB DEFAULT '{}'::jsonb
            );
        `;

        await client.query(createTableQuery);
        console.log('Notifications table created (if it didn\'t exist).');

        // Enable RLS
        await client.query(`ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;`);

        // Create Policies (Simplified for admin usage - assume admins can read all for now or just this specific implementation)
        // For this specific request, we want admins to see these notifications.
        // We'll add a policy for service role and potentially admins.

        // Drop existing policy if any
        await client.query(`DROP POLICY IF EXISTS "Enable read access for all for now" ON public.notifications;`);
        await client.query(`DROP POLICY IF EXISTS "Service role full access" ON public.notifications;`);

        // Add service role policy
        await client.query(`
            CREATE POLICY "Service role full access" 
            ON public.notifications 
            FOR ALL 
            TO service_role 
            USING (true) 
            WITH CHECK (true);
        `);
        console.log('RLS policies applied.');

        await client.end();
        console.log('Database initialization complete.');
    } catch (err) {
        console.error('Error initializing database:', err);
        process.exit(1);
    }
}

initDB();
