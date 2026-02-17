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

async function fixCommissions() {
    console.log('🛠 Starting Commission Fix...\n');

    // 1. Fetch all paid orders with coupons
    const { data: orders, error: oError } = await supabase
        .from('payment_orders')
        .select('order_id, amount, coupon_code, user_id, status')
        .eq('status', 'paid')
        .not('coupon_code', 'is', null);

    if (oError) {
        console.error('Error fetching orders:', oError);
        return;
    }

    // 2. Fetch all coupons
    const { data: coupons } = await supabase
        .from('discount_coupons')
        .select('code, commission_rate, affiliate_id');

    const couponMap = new Map<string, any>();
    coupons?.forEach(c => couponMap.set(c.code.toLowerCase(), c));

    // 3. Fetch all earnings
    const { data: earnings } = await supabase
        .from('affiliate_earnings')
        .select('*');

    const earningsMap = new Map<string, any>();
    earnings?.forEach(e => {
        const orderId = e.metadata?.order_id;
        if (orderId) earningsMap.set(orderId, e);
    });

    const netChangeMap = new Map<string, number>();
    let fixCount = 0;

    for (const order of orders) {
        const coupon = couponMap.get(order.coupon_code.toLowerCase());
        if (!coupon) continue;

        const expectedRate = coupon.commission_rate !== null ? Number(coupon.commission_rate) / 100 : 0.07;
        const e = earningsMap.get(order.order_id);

        if (e) {
            const actualRate = e.metadata?.rate || (e.amount / order.amount);

            if (Math.abs(expectedRate - actualRate) > 0.001) {
                const newAmount = Number((order.amount * expectedRate).toFixed(2));
                const diff = Number((newAmount - e.amount).toFixed(2));

                console.log(`Fixing Order ${order.order_id}: ${order.coupon_code} (${actualRate * 100}% -> ${expectedRate * 100}%) | $${e.amount} -> $${newAmount} (Diff: $${diff})`);

                // Update earning record
                const { error: updateError } = await supabase
                    .from('affiliate_earnings')
                    .update({
                        amount: newAmount,
                        metadata: {
                            ...e.metadata,
                            rate: expectedRate,
                            is_custom_rate: expectedRate !== 0.07,
                            fix_applied_at: new Date().toISOString(),
                            original_amount: e.amount,
                            original_rate: actualRate
                        }
                    })
                    .eq('id', e.id);

                if (updateError) {
                    console.error(`Error updating earning ${e.id}:`, updateError);
                } else {
                    // Track net change per affiliate
                    const currentNet = netChangeMap.get(e.referrer_id) || 0;
                    netChangeMap.set(e.referrer_id, Number((currentNet + diff).toFixed(2)));
                    fixCount++;
                }
            }
        }
    }

    console.log(`\n✅ Updated ${fixCount} earning records.`);

    // 4. Update Profile Totals
    console.log('\n📊 Updating Affiliate Profile Totals...');
    for (const [referrerId, netChange] of netChangeMap.entries()) {
        if (Math.abs(netChange) < 0.01) continue;

        console.log(`Affiliate ${referrerId}: Applying net change of $${netChange}`);

        const { error: rpcError } = await supabase.rpc('increment_affiliate_commission', {
            p_user_id: referrerId,
            p_amount: netChange
        });

        if (rpcError) {
            console.error(`Error updating profile ${referrerId}:`, rpcError.message);
        } else {
            console.log(`✅ Success for ${referrerId}`);
        }
    }

    console.log('\n🌟 Commission fix completed successfully!');
}

fixCommissions();
