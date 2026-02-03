
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase Config');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRecentActivity() {
    console.log('🔍 Checking last 5 Payment Orders...');
    const { data: orders, error: orderError } = await supabase
        .from('payment_orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (orderError) console.error(orderError);

    for (const order of orders || []) {
        console.log(`\n📦 Order: ${order.order_id} | Status: ${order.status} | Amount: ${order.amount} | User: ${order.user_id}`);
        console.log(`   📅 Created: ${order.created_at}`);

        // Check if user has a referrer
        const { data: profile } = await supabase
            .from('profiles')
            .select('referred_by')
            .eq('id', order.user_id)
            .single();

        console.log(`   👤 Referred By: ${profile?.referred_by || 'None'}`);

        // Check commission
        const { data: matchingEarnings } = await supabase
            .from('affiliate_earnings')
            .select('*')
            .eq('referred_user_id', order.user_id)
            .order('created_at', { ascending: false });

        if (matchingEarnings && matchingEarnings.length > 0) {
            console.log(`   💰 Commissions Found: ${matchingEarnings.length}`);
            matchingEarnings.forEach(e => {
                console.log(`      - $${e.amount} (${e.status}) | ${e.created_at} | Ref: ${e.metadata?.order_id || 'N/A'}`);
            });
        } else {
            console.log(`   ❌ No commissions found for this user recently.`);
        }
    }
}

checkRecentActivity();
