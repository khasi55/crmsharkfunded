import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateData() {
    const sourceId = '93c8dc88-33d5-4c1e-b231-dc5aec02b84e'; // aimanjeeralbhavi@gamil.com
    const targetId = '5b933025-de92-4763-ab37-6ef8e346cd14'; // aaimanjeeralbhavi0@gmail.com

    console.log(`\n🚀 Starting migration from ${sourceId} to ${targetId}...`);

    const tables = [
        { name: 'challenges', col: 'user_id' },
        { name: 'payment_orders', col: 'user_id' },
        { name: 'orders', col: 'user_id' },
        { name: 'kyc', col: 'user_id' },
        { name: 'payouts', col: 'user_id' },
        { name: 'referrals', col: 'referrer_id' },
        { name: 'referrals', col: 'referred_id' },
        { name: 'coupons', col: 'created_by' },
        { name: 'affiliate_earnings', col: 'affiliate_id' },
        { name: 'user_devices', col: 'user_id' },
        { name: 'user_ips', col: 'user_id' },
        { name: 'notifications', col: 'user_id' }
    ];

    for (const table of tables) {
        process.stdout.write(`Moving ${table.name} (${table.col})... `);
        const { data, error } = await supabase
            .from(table.name)
            .update({ [table.col]: targetId })
            .eq(table.col, sourceId)
            .select('id');

        if (error) {
            if (error.message.includes('not find the table')) {
                console.log('Skipped (table not found)');
            } else {
                console.log(`\n❌ Error moving ${table.name}: ${error.message}`);
            }
        } else {
            console.log(`Success ✅ (${data?.length || 0} rows)`);
        }
    }

    console.log('\nMigration complete.');
}

migrateData().catch(console.error);
