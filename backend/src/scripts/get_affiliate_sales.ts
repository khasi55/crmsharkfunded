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

async function getSalesDetails(code: string) {
    console.log(`\n--- 💰 Sales Details for Code: ${code} ---`);

    // 1. Fetch orders
    const { data: orders, error: oError } = await supabase
        .from('payment_orders')
        .select('*')
        .ilike('coupon_code', code)
        .eq('status', 'paid')
        .order('created_at', { ascending: false });

    if (oError) {
        console.error('❌ Error fetching orders:', oError);
        return;
    }

    if (!orders || orders.length === 0) {
        console.log('❌ No paid orders found for this code.');
        return;
    }

    // 2. Fetch profiles
    const userIds = [...new Set(orders.map(o => o.user_id).filter(Boolean))];
    const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);

    const profileMap: Record<string, any> = {};
    profiles?.forEach(p => {
        profileMap[p.id] = p;
    });

    console.log(`✅ Found ${orders.length} paid orders:`);
    console.table(orders.map(o => ({
        Date: new Date(o.created_at).toLocaleString(),
        'Order ID': o.order_id,
        Customer: profileMap[o.user_id]?.full_name || 'Guest',
        Email: profileMap[o.user_id]?.email || 'Unknown',
        Amount: `${o.currency === 'INR' ? '₹' : '$'}${o.amount}`,
        Status: o.status
    })));
}

const code = process.argv[2] || 'c8725d2';
getSalesDetails(code);
