import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixMerge() {
    const wrongMergeTargetId = '35ac13a4-fc0d-4e53-9efe-60474bbc370f'; // "kunnthuwealth" originally, 3/3
    const correctTargetId = 'fa8c49ee-399a-404e-a68d-768027a6ee41'; // "kunthuwealth", 1/18

    console.log(`Moving challenges from ${wrongMergeTargetId} to ${correctTargetId}...`);
    const { data: challenges, error: chalErr } = await supabase
        .from('challenges')
        .update({ user_id: correctTargetId })
        .eq('user_id', wrongMergeTargetId)
        .select('id, login');
    if (chalErr) console.error("Error moving challenges:", chalErr);
    else console.log(`Moved ${challenges?.length || 0} challenges.`);

    console.log(`Moving payment orders...`);
    const { data: orders, error: ordErr } = await supabase
        .from('payment_orders')
        .update({ user_id: correctTargetId })
        .eq('user_id', wrongMergeTargetId)
        .select('order_id');
    if (ordErr) console.error("Error moving orders:", ordErr);
    else console.log(`Moved ${orders?.length || 0} orders.`);

    // Check KYC
    const { data: kyc } = await supabase.from('kyc').update({ user_id: correctTargetId }).eq('user_id', wrongMergeTargetId).select('id');
    if (kyc && kyc.length) console.log(`Moved ${kyc.length} KYC records.`);

    // Check Payouts
    const { data: payouts } = await supabase.from('payouts').update({ user_id: correctTargetId }).eq('user_id', wrongMergeTargetId).select('id');
    if (payouts && payouts.length) console.log(`Moved ${payouts.length} payout records.`);

    // Check Referrals
    const { data: refs } = await supabase.from('referrals').update({ referrer_id: correctTargetId }).eq('referrer_id', wrongMergeTargetId).select('id');
    if (refs && refs.length) console.log(`Moved ${refs.length} referrals (referrer).`);

    const { data: refs2 } = await supabase.from('referrals').update({ referred_id: correctTargetId }).eq('referred_id', wrongMergeTargetId).select('id');
    if (refs2 && refs2.length) console.log(`Moved ${refs2.length} referrals (referred).`);

    // Check Coupons
    const { data: coups } = await supabase.from('coupons').update({ created_by: correctTargetId }).eq('created_by', wrongMergeTargetId).select('id');
    if (coups && coups.length) console.log(`Moved ${coups.length} coupons.`);

    // Check Affiliates
    const { data: aff } = await supabase.from('affiliate_earnings').update({ affiliate_id: correctTargetId }).eq('affiliate_id', wrongMergeTargetId).select('id');
    if (aff && aff.length) console.log(`Moved ${aff.length} affiliate earnings.`);

    // User Devices
    const { data: dev } = await supabase.from('user_devices').update({ user_id: correctTargetId }).eq('user_id', wrongMergeTargetId).select('id');
    if (dev && dev.length) console.log(`Moved ${dev.length} user devices.`);

    // User IPs
    const { data: ips } = await supabase.from('user_ips').update({ user_id: correctTargetId }).eq('user_id', wrongMergeTargetId).select('id');
    if (ips && ips.length) console.log(`Moved ${ips.length} user IPs.`);

    // Notifications
    const { data: notif } = await supabase.from('notifications').update({ user_id: correctTargetId }).eq('user_id', wrongMergeTargetId).select('id');
    if (notif && notif.length) console.log(`Moved ${notif.length} notifications.`);

    // Revert profile email for the wrong merge target (the double n one)
    console.log("Reverting profile email for the old 'wrong' account...");
    const { error: profErr } = await supabase
        .from('profiles')
        .update({ email: 'kunnthuwealth3004@gmail.com' })
        .eq('id', wrongMergeTargetId);

    if (profErr) {
        console.error("Error updating profile email:", profErr);
    } else {
        console.log("Successfully reverted profile email to kunnthuwealth3004@gmail.com");
    }

    console.log("Fix completed.");
}

fixMerge();
