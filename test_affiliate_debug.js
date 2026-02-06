const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, 'backend/.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCommission() {
    const userId = 'bc233390-0e10-41b5-bdb6-2af66edd6af8';
    const amount = 21.006;
    const orderId = 'SF-ORDER-1770197156493-e04c5001';

    console.log(`🔍 Testing commission for User ${userId}, Order ${orderId}, Amount ${amount}`);

    const { data: orderData, error: orderError } = await supabase
        .from('payment_orders')
        .select('metadata')
        .eq('order_id', orderId)
        .single();

    if (orderError) {
        console.error('❌ Order Error:', orderError);
        return;
    }

    let referrerId = orderData?.metadata?.affiliate_id;
    console.log('Referrer ID from metadata:', referrerId);

    if (!referrerId) {
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('referred_by')
            .eq('id', userId)
            .single();

        if (profileError) {
            console.error('❌ Profile Error:', profileError);
            return;
        }
        referrerId = profile?.referred_by;
        console.log('Referrer ID from profile:', referrerId);
    }

    if (!referrerId) {
        console.log('ℹ️ No referrer found.');
        return;
    }

    const commissionRate = orderData?.metadata?.commission_rate !== undefined && orderData?.metadata?.commission_rate !== null
        ? Number(orderData.metadata.commission_rate) / 100
        : 0.07;

    const commissionAmount = Number((amount * commissionRate).toFixed(2));
    console.log(`💰 Rate: ${commissionRate * 100}%, Amount: ${commissionAmount}`);

    const { data: insertData, error: insertError } = await supabase.from('affiliate_earnings').insert({
        referrer_id: referrerId,
        referred_user_id: userId,
        amount: commissionAmount,
        commission_type: 'purchase',
        status: 'pending',
        metadata: {
            order_id: orderId,
            order_amount: amount,
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

testCommission();
