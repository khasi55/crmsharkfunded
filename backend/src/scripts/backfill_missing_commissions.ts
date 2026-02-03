
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

async function backfillCommissions() {
    console.log('🔄 Starting backfill/correction to 7%...');

    // 1. Get recent paid orders
    const { data: orders, error: orderError } = await supabase
        .from('payment_orders')
        .select('*')
        .eq('status', 'paid')
        .order('created_at', { ascending: false })
        .limit(50);

    if (orderError) {
        console.error('Error fetching orders:', orderError);
        return;
    }

    let fixedCount = 0;

    for (const order of orders) {
        // 2. Check if user is referred
        const { data: profile } = await supabase
            .from('profiles')
            .select('referred_by, full_name')
            .eq('id', order.user_id)
            .single();

        if (!profile || !profile.referred_by) continue;

        const referrerId = profile.referred_by;

        // 3. Expected Commission (7% Flat)
        const expectedCommission = Number((order.amount * 0.07).toFixed(2));
        if (expectedCommission <= 0) continue;

        // 4. Check for existing commission
        const { data: earnings } = await supabase
            .from('affiliate_earnings')
            .select('*')
            .eq('referred_user_id', order.user_id);

        let existing = earnings?.find(e => {
            if (e.metadata && typeof e.metadata === 'object' && 'order_id' in e.metadata) {
                // @ts-ignore
                return e.metadata.order_id === order.order_id;
            }
            const timeDiff = Math.abs(new Date(e.created_at).getTime() - new Date(order.created_at).getTime());
            return timeDiff < 3600000;
        });

        if (existing) {
            // Check if it needs correction (was 15% or different)
            const currentAmount = Number(existing.amount);
            const diff = expectedCommission - currentAmount;

            if (Math.abs(diff) > 0.01) {
                console.log(`⚠️  Mismatch for Order ${order.order_id}. Found $${currentAmount}, Expected $${expectedCommission} (7%). Correcting...`);

                // Update Earning
                await supabase.from('affiliate_earnings').update({
                    amount: expectedCommission,
                    metadata: { ...existing.metadata, rate: 0.07, note: 'Corrected to 7%' }
                }).eq('id', existing.id);

                // Update Profile Total
                await supabase.rpc('increment_affiliate_commission', {
                    p_user_id: referrerId,
                    p_amount: diff // Add the difference (can be negative)
                });
                console.log(`   ✅ Corrected.`);
                fixedCount++;
            } else {
                // console.log(`   ✅ Order ${order.order_id} already has correct 7% commission.`);
            }
            continue;
        }

        console.log(`⚠️  Missing Commission for Order ${order.order_id}`);
        console.log(`   User: ${profile.full_name}, Amount: ${order.amount}, Referrer: ${referrerId}`);
        console.log(`   Creating Commission Record of $${expectedCommission} (7%)...`);

        // Create Commission
        const { error: insertError } = await supabase.from('affiliate_earnings').insert({
            referrer_id: referrerId,
            referred_user_id: order.user_id,
            amount: expectedCommission,
            commission_type: 'purchase',
            status: 'pending',
            metadata: {
                order_id: order.order_id,
                order_amount: order.amount,
                rate: 0.07,
                note: 'Backfilled 7%'
            },
            created_at: new Date().toISOString()
        });

        if (insertError) {
            console.error('   ❌ Failed to insert:', insertError.message);
            continue;
        }

        // Increment Total
        const { error: rpcError } = await supabase.rpc('increment_affiliate_commission', {
            p_user_id: referrerId,
            p_amount: expectedCommission
        });

        if (rpcError) {
            const { data: refProfile } = await supabase.from('profiles').select('total_commission').eq('id', referrerId).single();
            const newTotal = (Number(refProfile?.total_commission) || 0) + expectedCommission;
            await supabase.from('profiles').update({ total_commission: newTotal }).eq('id', referrerId);
        }

        console.log('   ✅ Successfully backfilled commission.');
        fixedCount++;
    }

    console.log(`\n🎉 Process Complete. Fixed/Backfilled ${fixedCount} commissions.`);
}

backfillCommissions();
