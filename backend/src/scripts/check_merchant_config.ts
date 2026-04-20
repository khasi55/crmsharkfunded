import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env from backend root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMerchantConfig() {
    console.log('--- Checking Merchant Configurations ---');
    
    try {
        const { data, error } = await supabase
            .from('merchant_config')
            .select('*');

        if (error) {
            console.error('Error fetching merchant_config:', error);
            return;
        }

        if (!data || data.length === 0) {
            console.log('⚠️ No merchant configurations found in DB.');
        } else {
            data.forEach(gw => {
                console.log(`\nGateway: ${gw.gateway_name}`);
                console.log(`Status: ${gw.is_active ? '✅ Active' : '❌ Inactive'}`);
                console.log(`Webhhok Secret: ${gw.webhook_secret ? '✅ Set' : '❌ MISSING (Security Hole!)'}`);
                console.log(`API Key: ${gw.api_key ? '✅ Set' : '❌ Missing'}`);
                console.log(`Environment: ${gw.environment}`);
            });
        }
    } catch (e) {
        console.error('Unexpected error:', e);
    }
}

checkMerchantConfig();
