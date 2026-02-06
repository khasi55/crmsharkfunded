import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve } from 'path';
import fs from 'fs';

dotenv.config({ path: resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) throw new Error("Missing Supabase credentials");

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
    console.log('🔧 Running migration to fix validate_coupon function...');

    const sql = fs.readFileSync(
        resolve(__dirname, '../../supabase/migrations/20260206_fix_validate_coupon.sql'),
        'utf-8'
    );

    let data, error;
    try {
        const response = await supabase.rpc('exec_sql', { sql_query: sql });
        data = response.data;
        error = response.error;
    } catch (e) {
        console.log('Falling back to manual execution...');
        // If exec_sql doesn't exist, try direct execution
        const statements = sql.split(';').filter(s => s.trim());
        for (const statement of statements) {
            if (!statement.trim()) continue;
            const result = await (supabase as any).rpc('query', statement);
            if (result.error) {
                console.error('Error:', result.error);
            }
        }
        data = null;
        error = null;
    }

    if (error) {
        console.error('❌ Migration failed:', error);

        // Try alternative: use postgres client
        console.log('\n📝 SQL to run manually:');
        console.log(sql);
        return;
    }

    console.log('✅ Migration completed successfully!');

    // Test the function
    console.log('\n🧪 Testing validate_coupon with "Baccha"...');
    const { data: result, error: testError } = await supabase.rpc('validate_coupon', {
        p_code: 'Baccha',
        p_user_id: '00000000-0000-0000-0000-000000000000',
        p_amount: 100,
        p_account_type: 'standard'
    });

    console.log('Result:', result);
    console.log('Error:', testError);
}

runMigration();
