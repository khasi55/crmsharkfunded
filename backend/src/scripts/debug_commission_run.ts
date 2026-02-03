
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

async function runDebug() {
    const orderId = 'SF-ORDER-1770108033271-79f2d55c';
    const userId = '7e2e9829-5426-4ccd-abc4-fbb9785767e3';
    const amount = 400;

    console.log(`🔍 Debugging Commission for Order: ${orderId}`);
    console.log(`   User: ${userId}`);
    console.log(`   Amount: ${amount}`);

    // 1. Check Profile
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('referred_by')
        .eq('id', userId)
        .single();

    if (profileError) {
        console.error('❌ Profile Error:', profileError);
        return;
    }

    if (!profile || !profile.referred_by) {
        console.log(`⚠️ User not referred. Profile:`, profile);
        return;
    }

    const referrerId = profile.referred_by;
    console.log(`✅ Referrer Found: ${referrerId}`);

    // 2. Calculate
    const commissionRate = 0.07;
    const commissionAmount = Number((amount * commissionRate).toFixed(2));
    console.log(`💰 Commission: ${commissionAmount}`);

    // 3. Insert
    const { data, error } = await supabase.from('affiliate_earnings').insert({
        referrer_id: referrerId,
        referred_user_id: userId,
        amount: commissionAmount,
        commission_type: 'purchase',
        status: 'pending',
        metadata: {
            order_id: orderId,
            order_amount: amount,
            rate: commissionRate
        }
    }).select();

    if (error) {
        console.error('❌ Insert Error:', error);
    } else {
        console.log('✅ Insert Success:', data);
    }
}

runDebug();
