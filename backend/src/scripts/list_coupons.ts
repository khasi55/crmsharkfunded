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

async function listCoupons() {
    console.log(`🔍 Listing all coupons...`);
    const { data, error } = await supabase
        .from('coupons')
        .select('*');

    if (error) {
        console.error('❌ Error fetching coupons:', error);
        return;
    }

    console.log('Coupons:', JSON.stringify(data, null, 2));
}

listCoupons();
