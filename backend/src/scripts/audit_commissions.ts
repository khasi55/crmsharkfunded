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

async function auditCommissions() {
    console.log('🔍 Starting Commission Audit...\n');

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

    console.log(`Found ${orders.length} paid orders with coupons.`);

    // 2. Fetch all coupons to get their rates
    const { data: coupons } = await supabase
        .from('discount_coupons')
        .select('code, commission_rate, affiliate_id');

    const couponMap = new Map<string, any>();
    coupons?.forEach(c => couponMap.set(c.code.toLowerCase(), c));

    // 3. Fetch all earnings to compare
    const { data: earnings } = await supabase
        .from('affiliate_earnings')
        .select('*');

    const earningsMap = new Map<string, any>();
    earnings?.forEach(e => {
        const orderId = e.metadata?.order_id;
        if (orderId) earningsMap.set(orderId, e);
    });

    const discrepancies: any[] = [];
    let totalFixableAmount = 0;

    for (const order of orders) {
        const coupon = couponMap.get(order.coupon_code.toLowerCase());
        if (!coupon) continue;

        const expectedRate = coupon.commission_rate !== null ? Number(coupon.commission_rate) / 100 : 0.07;
        const e = earningsMap.get(order.order_id);

        if (e) {
            const actualRate = e.metadata?.rate || (e.amount / order.amount);

            // Allow for minor floating point diffs
            if (Math.abs(expectedRate - actualRate) > 0.001) {
                discrepancies.push({
                    order_id: order.order_id,
                    coupon: order.coupon_code,
                    amount: order.amount,
                    expectedRate: expectedRate * 100,
                    actualRate: actualRate * 100,
                    expectedComm: Number((order.amount * expectedRate).toFixed(2)),
                    actualComm: e.amount,
                    diff: Number(((order.amount * expectedRate) - e.amount).toFixed(2)),
                    earning_id: e.id,
                    referrer_id: e.referrer_id
                });
                totalFixableAmount += Math.abs(order.amount * expectedRate - e.amount);
            }
        }
    }

    if (discrepancies.length === 0) {
        console.log('✅ No commission discrepancies found. Everything is accurate!');
    } else {
        console.log(`\n⚠️ Found ${discrepancies.length} discrepancies!\n`);
        console.table(discrepancies.map(d => ({
            Order: d.order_id,
            Coupon: d.coupon,
            'Total': `$${d.amount}`,
            'Exp %': `${d.expectedRate}%`,
            'Act %': `${Number(d.actualRate).toFixed(1)}%`,
            'Exp $': `$${d.expectedComm}`,
            'Act $': `$${d.actualComm}`,
            'Diff': `$${d.diff}`
        })));

        console.log(`\nTotal absolute adjustment needed: $${totalFixableAmount.toFixed(2)}`);
    }
}

auditCommissions();
