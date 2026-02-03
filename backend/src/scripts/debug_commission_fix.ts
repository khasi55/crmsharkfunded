
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

async function diagnoseAndFix() {
    console.log('🕵️‍♂️ Starting Commission Diagnosis...');

    // 1. Get recent paid orders (Last 50)
    const { data: orders, error: orderError } = await supabase
        .from('payment_orders')
        .select('*')
        .eq('status', 'paid')
        .order('created_at', { ascending: false })
        .limit(50);

    if (orderError) {
        console.error('❌ Error fetching orders:', orderError);
        return;
    }

    console.log(`📋 Checked ${orders.length} recent paid orders.`);

    let issuesFound = 0;
    let fixedCount = 0;

    for (const order of orders) {
        // 2. Check if user is referred
        const { data: profile } = await supabase
            .from('profiles')
            .select('referred_by, full_name, email')
            .eq('id', order.user_id)
            .single();

        if (!profile) {
            console.log(`⚠️  User profile not found for order ${order.order_id} (User: ${order.user_id})`);
            continue;
        }

        if (!profile.referred_by) {
            // User was not referred, so no commission expected.
            // console.log(`   - Order ${order.order_id}: No referrer (Skipping)`);
            continue;
        }

        const referrerId = profile.referred_by;

        // 3. Expected Commission (7%)
        const commissionRate = 0.07;
        const expectedCommission = Number((order.amount * commissionRate).toFixed(2));

        if (expectedCommission <= 0) continue;

        // 4. Check for existing commission record
        // We look for a commission for this referred_user_id around the same time or with same order_id metadata
        const { data: earnings } = await supabase
            .from('affiliate_earnings')
            .select('*')
            .eq('referred_user_id', order.user_id)
            .eq('referrer_id', referrerId);

        // Try to match specific order
        const match = earnings?.find(e => {
            // Check metadata first
            if (e.metadata && (e.metadata as any).order_id === order.order_id) return true;

            // Fallback: Check amount and time (within 1 hour)
            const amountMatch = Number(e.amount) === expectedCommission;
            const timeDiff = Math.abs(new Date(e.created_at).getTime() - new Date(order.created_at).getTime());
            return amountMatch && timeDiff < 3600000;
        });

        if (match) {
            // console.log(`   ✅ Order ${order.order_id}: Commission found (ID: ${match.id})`);
            continue;
        }

        // 5. MISSING COMMISSION FOUND
        issuesFound++;
        console.log(`\n🔴 MISSING COMMISSION for Order ${order.order_id}`);
        console.log(`   User: ${profile.full_name} (${profile.email})`);
        console.log(`   Referrer ID: ${referrerId}`);
        console.log(`   Order Amount: $${order.amount} -> Expected Commission: $${expectedCommission} (7%)`);

        // FIX IT
        console.log(`   🛠  Attempting to fix...`);

        const { data: newCommission, error: insertError } = await supabase
            .from('affiliate_earnings')
            .insert({
                referrer_id: referrerId,
                referred_user_id: order.user_id,
                amount: expectedCommission,
                commission_type: 'purchase',
                status: 'pending',
                metadata: {
                    order_id: order.order_id,
                    order_amount: order.amount,
                    rate: commissionRate,
                    note: 'Fixed by debug_commission_fix.ts'
                },
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (insertError) {
            console.error(`   ❌ Failed to insert commission: ${insertError.message}`);
        } else {
            console.log(`   ✅ Created commission record: ${newCommission.id}`);

            // Increment total for referrer
            const { error: rpcError } = await supabase.rpc('increment_affiliate_commission', {
                p_user_id: referrerId,
                p_amount: expectedCommission
            });

            if (rpcError) {
                console.warn(`   ⚠️  RPC failed: ${rpcError.message}. Manually updating profile...`);
                // Manual fallback
                const { data: refProfile } = await supabase.from('profiles').select('total_commission').eq('id', referrerId).single();
                const currentTotal = Number(refProfile?.total_commission || 0);
                await supabase.from('profiles').update({ total_commission: currentTotal + expectedCommission }).eq('id', referrerId);
                console.log(`   ✅ Profile total updated manually.`);
            } else {
                console.log(`   ✅ Referrer total_commission updated via RPC.`);
            }
            fixedCount++;
        }
    }

    console.log(`\n🏁 Diagnosis Complete.`);
    console.log(`   Issues Found: ${issuesFound}`);
    console.log(`   Fixed: ${fixedCount}`);
}

diagnoseAndFix();
