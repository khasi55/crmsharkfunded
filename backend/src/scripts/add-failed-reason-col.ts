
import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function migrate() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        await client.connect();
        console.log('Connected to database.');

        console.log('Adding failed_reason column to challenges table...');
        await client.query(`
            ALTER TABLE challenges 
            ADD COLUMN IF NOT EXISTS failed_reason TEXT;
        `);
        console.log('✅ Column added successfully.');

        // Optional: Retroactively populate failed_reason from latest risk_violations
        console.log('Attempting to retroactive populate failed_reason...');
        await client.query(`
            UPDATE challenges c
            SET failed_reason = r.violation_type || ': ' || r.description
            FROM (
                SELECT DISTINCT ON (challenge_id) challenge_id, violation_type, description
                FROM risk_violations
                ORDER BY challenge_id, created_at DESC
            ) r
            WHERE c.id = r.challenge_id
            AND c.status = 'failed'
            AND c.failed_reason IS NULL;
        `);
        console.log('✅ Retroactive population complete.');

    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        await client.end();
    }
}

migrate();
