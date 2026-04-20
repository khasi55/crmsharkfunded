import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkGlobalPricing() {
    console.log('--- Checking Global Pricing Configuration ---');
    try {
        const { data, error } = await supabase
            .from('pricing_configurations')
            .select('config')
            .eq('key', 'global_pricing')
            .single();

        if (error) {
            console.error('Error fetching global_pricing:', error);
            return;
        }

        console.log('Global Pricing Config:', JSON.stringify(data?.config, null, 2));
    } catch (e) {
        console.error('Unexpected error:', e);
    }
}

checkGlobalPricing();
