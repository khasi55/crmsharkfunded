const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, 'backend/.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCommissions() {
    const orders = [
        { id: 'SF-ORDER-1770198075272-051504b1', amount: 62.31, userId: '04a05ed2-1e1d-45aa-86d2-d0572501e7ed' },
        { id: 'SF-ORDER-1770197948930-aaef2b13', amount: 21.01, userId: '04a05ed2-1e1d-45aa-86d2-d0572501e7ed' }
    ];

    for (const order of orders) {
        console.log(`\n🔍 Testing commission for User ${order.userId}, Order ${order.id}, Amount ${order.amount}`);

        const { data: orderData, error: orderError } = await supabase
            .from('payment_orders')
            .select('metadata')
            .eq('order_id', order.id)
            .single();

        if (orderError) {
            console.error('❌ Order Error:', orderError);
            continue;
        }

        let referrerId = orderData?.metadata?.affiliate_id;
        console.log('Referrer ID from metadata:', referrerId);

        if (!referrerId) {
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('referred_by')
                .eq('id', order.userId)
                .single();

            if (profileError) {
                console.error('❌ Profile Error:', profileError);
                continue;
            }
            referrerId = profile?.referred_by;
            console.log('Referrer ID from profile:', referrerId);
        }

        if (!referrerId) {
            console.log('ℹ️ No referrer found.');
            continue;
        }

        const commissionRate = orderData?.metadata?.commission_rate !== undefined && orderData?.metadata?.commission_rate !== null
            ? Number(orderData.metadata.commission_rate) / 100
            : 0.07;

        const commissionAmount = Number((order.amount * commissionRate).toFixed(2));
        console.log(`💰 Rate: ${commissionRate * 100}%, Amount: ${commissionAmount}`);

        const { data: insertData, error: insertError } = await supabase.from('affiliate_earnings').insert({
            referrer_id: referrerId,
            referred_user_id: order.userId,
            amount: commissionAmount,
            commission_type: 'purchase',
            status: 'pending',
            metadata: {
                order_id: order.id,
                order_amount: order.amount,
                rate: commissionRate,
                is_custom_rate: commissionRate !== 0.07
            }
        }).select();

        if (insertError) {
            console.error('❌ Insert Error:', insertError);
        } else {
            console.log('✅ Commission inserted successfully:', insertData);
        }

        const { error: rpcError } = await supabase.rpc('increment_affiliate_commission', {
            p_user_id: referrerId,
            p_amount: commissionAmount
        });

        if (rpcError) {
            console.warn('⚠️ RPC Warning:', rpcError);
        } else {
            console.log('✅ RPC success');
        }
    }
}

testCommissions();
