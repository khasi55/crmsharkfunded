import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkConfig() {
    const { data, error } = await supabase
        .from('merchant_config')
        .select('*')
        .eq('gateway_name', 'SharkPay')
        .single();

    if (error) {
        console.error('Error fetching config:', error.message);
        return;
    }

    console.log('SharkPay config in DB:', {
        api_key: data.api_key,
        api_secret: data.api_secret ? 'EXISTS' : 'MISSING',
        is_active: data.is_active,
        environment: data.environment
    });
}

checkConfig();
