
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { count, error } = await supabase.from('payment_orders').select('*', { count: 'exact', head: true });
    console.log('Total payment orders:', count);
    if (error) {
        console.error('Error:', error);
        return;
    }

    const { data: latest } = await supabase
        .from('payment_orders')
        .select('order_id, status, created_at, amount, user_id')
        .order('created_at', { ascending: false })
        .limit(10);

    console.log('Latest 10 orders:');
    console.table(latest);
}

run();
