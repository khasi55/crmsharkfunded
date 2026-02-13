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

async function checkAccountTypes() {
    console.log('🔍 Auditing MT5 Groups in account_types...');

    const { data, error } = await supabase
        .from('account_types')
        .select('*');

    if (error) {
        console.error('❌ Error fetching account_types:', error);
        return;
    }

    console.table(data);

    console.log('\n🔍 Checking MT5 Server Config...');
    const { data: config, error: configError } = await supabase
        .from('mt5_server_config')
        .select('*');

    if (configError) {
        console.error('❌ Error fetching mt5_server_config:', configError);
    } else {
        console.log('MT5 Server Config:', config);
    }
}

checkAccountTypes();
