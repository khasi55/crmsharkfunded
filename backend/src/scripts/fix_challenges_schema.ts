import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addMissingColumns() {
    console.log('🛠 Adding missing columns to "challenges" table...\n');

    // SQL to add columns if they don't exist
    const sql = `
        DO $$ 
        BEGIN 
            IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'challenges' AND COLUMN_NAME = 'breached_at') THEN
                ALTER TABLE challenges ADD COLUMN breached_at TIMESTAMPTZ;
            END IF;

            IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'challenges' AND COLUMN_NAME = 'upgraded_at') THEN
                ALTER TABLE challenges ADD COLUMN upgraded_at TIMESTAMPTZ;
            END IF;

            IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'challenges' AND COLUMN_NAME = 'last_upgrade_at') THEN
                ALTER TABLE challenges ADD COLUMN last_upgrade_at TIMESTAMPTZ;
            END IF;
        END $$;
    `;

    // Try to run via RPC if available
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
        console.error('❌ Error applying SQL:', error.message);
        console.log('\n⚠️ Please apply the following SQL manually in the Supabase Dashboard:');
        console.log(sql);
    } else {
        console.log('✅ Columns added successfully!');
    }
}

addMissingColumns();
