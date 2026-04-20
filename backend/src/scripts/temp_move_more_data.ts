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

async function checkOtherTables() {
    const oldId = 'fa8c49ee-399a-404e-a68d-768027a6ee41';
    const newId = '35ac13a4-fc0d-4e53-9efe-60474bbc370f';

    // Check KYC
    const { data: kyc, error: kycErr } = await supabase.from('kyc').update({ user_id: newId }).eq('user_id', oldId).select('id');
    console.log(`Moved ${kyc?.length || 0} KYC records.`);

    // Check Payouts
    const { data: payouts, error: payErr } = await supabase.from('payouts').update({ user_id: newId }).eq('user_id', oldId).select('id');
    console.log(`Moved ${payouts?.length || 0} payout records.`);

    // Check Referrals
    const { data: refs, error: refErr } = await supabase.from('referrals').update({ referrer_id: newId }).eq('referrer_id', oldId).select('id');
    console.log(`Moved ${refs?.length || 0} referrals (referrer).`);

    const { data: refs2, error: refErr2 } = await supabase.from('referrals').update({ referred_id: newId }).eq('referred_id', oldId).select('id');
    console.log(`Moved ${refs2?.length || 0} referrals (referred).`);

    // Check Coupons
    const { data: coups, error: coupErr } = await supabase.from('coupons').update({ created_by: newId }).eq('created_by', oldId).select('id');
    console.log(`Moved ${coups?.length || 0} coupons.`);

    // Check Affiliates
    const { data: aff, error: affErr } = await supabase.from('affiliate_earnings').update({ affiliate_id: newId }).eq('affiliate_id', oldId).select('id');
    console.log(`Moved ${aff?.length || 0} affiliate earnings.`);

    // User Devices
    const { data: dev, error: devErr } = await supabase.from('user_devices').update({ user_id: newId }).eq('user_id', oldId).select('id');
    console.log(`Moved ${dev?.length || 0} user devices.`);

    // User IPs
    const { data: ips, error: ipsErr } = await supabase.from('user_ips').update({ user_id: newId }).eq('user_id', oldId).select('id');
    console.log(`Moved ${ips?.length || 0} user IPs.`);

    // Notifications
    const { data: notif, error: notifErr } = await supabase.from('notifications').update({ user_id: newId }).eq('user_id', oldId).select('id');
    console.log(`Moved ${notif?.length || 0} notifications.`);

    console.log("Finished checking other tables.");
}

checkOtherTables();
