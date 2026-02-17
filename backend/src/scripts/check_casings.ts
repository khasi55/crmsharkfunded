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

async function checkCasings() {
    const { data: orders } = await supabase
        .from('payment_orders')
        .select('coupon_code')
        .ilike('coupon_code', 'NEW40')
        .eq('status', 'paid');

    const codes = [...new Set(orders?.map(o => o.coupon_code))];
    console.log('Distinct NEW40 Casings in Paid Orders:', codes);
}

checkCasings();
