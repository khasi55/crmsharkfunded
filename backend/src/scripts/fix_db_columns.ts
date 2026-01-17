import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from backend root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function runMigration() {
    // Try DATABASE_URL, fallback to common Supabase patterns
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

    if (!connectionString) {
        console.error('❌ DATABASE_URL or POSTGRES_URL not found in environment.');
        console.log('Available Env Keys:', Object.keys(process.env).filter(k => k.includes('DB') || k.includes('URL')));
        process.exit(1);
    }

    console.log(`🔌 Connecting to Database...`);

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false } // Required for Supabase/Neon typically
    });

    try {
        await client.connect();
        console.log('✅ Connected.');

        const sql = `
            -- Fix for missing profile columns (Address, Display Name, Pincode, Wallet)
            ALTER TABLE public.profiles 
            ADD COLUMN IF NOT EXISTS display_name TEXT,
            ADD COLUMN IF NOT EXISTS phone TEXT,
            ADD COLUMN IF NOT EXISTS country TEXT,
            ADD COLUMN IF NOT EXISTS city TEXT,
            ADD COLUMN IF NOT EXISTS address TEXT,
            ADD COLUMN IF NOT EXISTS pincode TEXT,
            ADD COLUMN IF NOT EXISTS wallet_balance DECIMAL(15, 2) DEFAULT 0.00;
        `;

        console.log('🔄 Executing Migration...');
        await client.query(sql);
        console.log('✅ Migration Successful: Columns added to public.profiles');

    } catch (err: any) {
        console.error('❌ Migration Failed:', err.message);
    } finally {
        await client.end();
    }
}

runMigration();
