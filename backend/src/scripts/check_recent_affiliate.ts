
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Adjust path to point to backend .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL/Key in environment');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRecentAffiliate() {
    console.log('🔍 Checking recent paid orders for affiliate commissions...\n');

    // 1. Get recent paid orders
    const { data: orders, error: orderError } = await supabase
        .from('payment_orders')
        .select('*')
        .eq('status', 'paid')
        .order('created_at', { ascending: false })
        .limit(5);

    if (orderError) {
        console.error('❌ Error fetching orders:', orderError);
        return;
    }

    if (!orders || orders.length === 0) {
        console.log('No recent paid orders found.');
        return;
    }

    for (const order of orders) {
        console.log(`--------------------------------------------------`);
        console.log(`🛒 Order ID: ${order.order_id}`);
        console.log(`   User ID: ${order.user_id}`);
        console.log(`   Amount: ${order.amount}`);
        console.log(`   Date: ${order.created_at}`);

        // 2. Check if user was referred
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, full_name, referred_by')
            .eq('id', order.user_id)
            .single();

        if (profileError) {
            console.error(`   ❌ Error fetching profile: ${profileError.message}`);
            continue;
        }

        if (!profile.referred_by) {
            console.log(`   ℹ️  User ${profile.full_name || 'Unknown'} was NOT referred.`);
        } else {
            console.log(`   ✅ User ${profile.full_name || 'Unknown'} was referred by: ${profile.referred_by}`);

            // 3. Check for earnings record
            // We check for earnings created around the same time or with metadata linking to order
            const { data: earnings, error: earnError } = await supabase
                .from('affiliate_earnings')
                .select('*')
                .eq('referred_user_id', order.user_id)
                .order('created_at', { ascending: false }); // get all earnings for this user ref

            if (earnError) {
                console.error(`   ❌ Error fetching earnings: ${earnError.message}`);
            } else if (earnings && earnings.length > 0) {
                // Try to match specific order if possible (if metadata exists) or just show recent
                const match = earnings.find(e => {
                    // If metadata exists and has order_id
                    if (e.metadata && typeof e.metadata === 'object' && 'order_id' in e.metadata) {
                        // @ts-ignore
                        return e.metadata.order_id === order.order_id;
                    }
                    // Fallback mechanism: check if created within 5 mins of order
                    const orderTime = new Date(order.created_at).getTime();
                    const earnTime = new Date(e.created_at).getTime();
                    return Math.abs(orderTime - earnTime) < 5 * 60 * 1000;
                });

                if (match) {
                    console.log(`   💰 FOUND COMMISSION:`);
                    console.log(`      ID: ${match.id}`);
                    console.log(`      Amount: ${match.amount}`);
                    console.log(`      Referrer: ${match.referrer_id}`);
                    console.log(`      Status: ${match.status || 'N/A'}`);
                } else {
                    console.log(`   ⚠️  Earnings found for user, but didn't match this specific order time/metadata.`);
                    console.log(`      Recent earnings:`, earnings.slice(0, 2));
                }
            } else {
                console.log(`   ❌ NO COMMISSION found in affiliate_earnings table.`);
            }
        }
    }
    console.log(`--------------------------------------------------`);
}

checkRecentAffiliate();
