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

async function listAllCouponOrders() {
    console.log(`\n--- 💰 Listing all Paid Orders with Coupons ---`);

    // 1. Fetch orders
    const { data: orders, error: oError } = await supabase
        .from('payment_orders')
        .select('*')
        .not('coupon_code', 'is', null)
        .eq('status', 'paid')
        .order('created_at', { ascending: false })
        .limit(50);

    if (oError) {
        console.error('❌ Error fetching orders:', oError);
        return;
    }

    if (!orders || orders.length === 0) {
        console.log('❌ No paid orders found with coupons.');
        return;
    }

    console.log(`✅ Found ${orders.length} paid orders with coupons:`);
    console.table(orders.map(o => ({
        Date: new Date(o.created_at).toLocaleString(),
        'Order ID': o.order_id,
        'Coupon Code': o.coupon_code,
        Amount: `${o.currency === 'INR' ? '₹' : '$'}${o.amount}`,
        Status: o.status
    })));
}

listAllCouponOrders();
