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

async function countStatus() {
    const { data: orders } = await supabase
        .from('payment_orders')
        .select('status, coupon_code')
        .ilike('coupon_code', 'NEW40');

    const counts: Record<string, number> = {};
    orders?.forEach(o => {
        counts[o.status] = (counts[o.status] || 0) + 1;
    });
    console.log('NEW40 Status Counts:', counts);

    // Also check SHARK30 for comparison
    const { data: s30 } = await supabase
        .from('payment_orders')
        .select('status, coupon_code')
        .ilike('coupon_code', 'SHARK30');

    const s30Counts: Record<string, number> = {};
    s30?.forEach(o => {
        s30Counts[o.status] = (s30Counts[o.status] || 0) + 1;
    });
    console.log('SHARK30 Status Counts:', s30Counts);
}

countStatus();
