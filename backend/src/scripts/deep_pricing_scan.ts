import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function check() {
    console.log('--- DEEP PRICING SCAN ---');

    const tablesToCheck = ['pricing_configurations', 'pricing_config', 'config', 'settings'];

    for (const table of tablesToCheck) {
        console.log(`Checking table: ${table}...`);
        const { data, error } = await supabase.from(table).select('*');
        if (error) {
            console.warn(`  [${table}] Error:`, error.message);
        } else {
            console.log(`  [${table}] SUCCESS! Data:`, JSON.stringify(data, null, 2));
        }
    }

    console.log('\n--- ATTEMPTING RAW QUERY VIA RPC if exists ---');
    const { data: rawData, error: rawError } = await supabase.rpc('get_pricing_config_debug');
    if (rawError) {
        console.warn('  RPC get_pricing_config_debug failed or not found.');
    } else {
        console.log('  RPC SUCCESS! Data:', JSON.stringify(rawData, null, 2));
    }
}
check();
