import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve } from 'path';
import fs from 'fs';
import { Client } from 'pg';

dotenv.config({ path: resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

if (!supabaseUrl || !supabaseKey) throw new Error("Missing Supabase credentials");

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
    console.log('🔧 Running migration to ADD BOGO Discount Type...');

    const sqlPath = resolve(__dirname, '../../../frontend/supabase/migrations/20250214_add_bogo_discount_type.sql');

    if (!fs.existsSync(sqlPath)) {
        console.error('❌ Migration file not found at:', sqlPath);
        return;
    }

    const sql = fs.readFileSync(sqlPath, 'utf-8');

    if (dbUrl) {
        console.log('🔌 Connecting to database via PG client...');
        const client = new Client({
            connectionString: dbUrl,
            ssl: { rejectUnauthorized: false } // Required for Supabase in many environments
        });

        try {
            await client.connect();
            console.log('✅ Connected.');
            await client.query(sql);
            console.log('✅ Migration executed successfully via PG!');
            await client.end();
        } catch (dbErr: any) {
            console.error('❌ PG Execution Failed:', dbErr.message);
            await client.end();
            return;
        }
    } else {
        console.warn('⚠️ DATABASE_URL not found. Cannot run migration via PG. Trying RPC fallback (likely to fail)...');

        try {
            const response = await supabase.rpc('exec_sql', { sql_query: sql });
            if (response.error) throw response.error;
            console.log('✅ Migration executed successfully via RPC!');
        } catch (rpcErr: any) {
            console.error('❌ RPC Failed:', rpcErr.message);
            console.log('PLEASE RUN THIS SQL MANUALLY:');
            console.log(sql);
            // Don't return, let's try to test anyway in case it was magically fixed
        }
    }

    // Test: Insert a BOGO coupon
    console.log('\n🧪 Testing BOGO Coupon Insertion...');
    const testCode = `TESTBOGO${Date.now()}`;

    const { data: coupon, error: insertError } = await supabase
        .from('discount_coupons')
        .insert({
            code: testCode,
            discount_type: 'bogo',
            discount_value: 0,
            is_active: true,
            description: 'Test BOGO Coupon'
        })
        .select()
        .single();

    if (insertError) {
        console.error('❌ Insert Failed:', insertError);
    } else {
        console.log('✅ BOGO Coupon Inserted Successfully:', coupon);

        // Test Validation
        console.log('\n🧪 Testing Validation...');
        const { data: validation, error: valError } = await supabase.rpc('validate_coupon', {
            p_code: testCode,
            p_user_id: '00000000-0000-0000-0000-000000000000',
            p_amount: 100,
            p_account_type: 'standard'
        });

        console.log('Validation Result:', validation);

        // Clean up
        await supabase.from('discount_coupons').delete().eq('code', testCode);
    }
}

runMigration();
