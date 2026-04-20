import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function listAllPricing() {
    console.log('--- Listing All Pricing Configurations ---');
    try {
        const { data, error } = await supabase
            .from('pricing_configurations')
            .select('*');

        if (error) {
            console.error('Error fetching pricing_configurations:', error);
            return;
        }

        console.log('Configs:', JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Unexpected error:', e);
    }
}

listAllPricing();
