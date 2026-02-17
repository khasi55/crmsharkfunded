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

async function checkNew40() {
    const { data: coupons, error } = await supabase
        .from('discount_coupons')
        .select(`
            *,
            profiles:affiliate_id (email, full_name)
        `)
        .ilike('code', 'NEW40');

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('NEW40 Details:', JSON.stringify(coupons, null, 2));
}

checkNew40();
