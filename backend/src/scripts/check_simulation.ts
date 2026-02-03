
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkSimulation() {
    console.log('🕵️Checking Simulation Result...');

    // 1. Find the SIM order
    const { data: orders } = await supabase
        .from('payment_orders')
        .select('*')
        .ilike('order_id', '%SF-ORDER-SIM-%')
        .order('created_at', { ascending: false })
        .limit(1);

    if (!orders || orders.length === 0) {
        console.log('❌ No Simulation Order Found!');
        return;
    }

    const order = orders[0];
    console.log(`📦 Order Found: ${order.order_id} (Status: ${order.status})`);

    // 2. Check for Commission
    const { data: commissions } = await supabase
        .from('affiliate_earnings')
        .select('*')
        .eq('referred_user_id', order.user_id)
        .order('created_at', { ascending: false })
        .limit(5);

    console.log('💰 Recent Commissions for User:', order.user_id);
    commissions?.forEach(c => {
        console.log(`   - $${c.amount} (Metadata Order: ${c.metadata?.order_id})`);
    });

    const match = commissions?.find(c => c.metadata?.order_id === order.order_id);
    if (match) {
        console.log('✅ TEST PASSED: Commission was created!');
    } else {
        console.log('❌ TEST FAILED: Commission NOT found.');
    }
}

checkSimulation();
