
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function check() {
    const { data: configs, error } = await supabase
        .from('merchant_config')
        .select('*')
        .eq('gateway_name', 'SharkPay');

    if (error) {
        console.error('Error fetching merchant_config:', error.message);
        return;
    }

    if (!configs || configs.length === 0) {
        console.log('No SharkPay config found in merchant_config table.');
        return;
    }

    console.log('SharkPay config from DB:');
    configs.forEach(c => {
        console.log(`- API Key: ${c.api_key}`);
        console.log(`- API Secret: ${c.api_secret ? 'EXISTS' : 'MISSING'}`);
        console.log(`- Webhook Secret: ${c.webhook_secret}`);
        console.log(`- Is Active: ${c.is_active}`);
    });
}

check();
