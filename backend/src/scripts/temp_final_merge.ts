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

async function finalMerge() {
    const desiredEmail = 'kunthuwealth3004@gmail.com'; // 1/18, fa8c...
    const otherEmail = 'kunnthuwealth3004@gmail.com'; // 3/3, 35ac...
    const oldRenamedEmail = 'old_kunthuwealth3004@gmail.com';

    console.log("Checking current state of these three possible emails...");
    const { data: profiles } = await supabase.from('profiles').select('id, email, full_name, created_at').in('email', [desiredEmail, otherEmail, oldRenamedEmail]);

    console.log("Found profiles:");
    console.log(profiles);

    if (!profiles || profiles.length === 0) return;

    // The user definitively told us earlier: 
    // "kunnthuwealth3004@gmail.com wale account ko kunthuwealth3004@gmail.com wali I'd pr shift Krna tha apne ulta kr diya hai"
    // "kunthuwealth3004@gmail.com" has the ID "fa8c49ee-399a-404e-a68d-768027a6ee41" (from the screenshot where it showed 1/18/2026 joined date)
    // He wants all the data on THAT ID (fa8c...), not the other one.

    // We already renamed the fa8c ID to "old_kunthuwealth3004@gmail.com". Let's put it back to "kunthuwealth3004@gmail.com".
    // AND let's move all the data to IT.

    const correctTargetId = 'fa8c49ee-399a-404e-a68d-768027a6ee41';
    const wrongSourceId = '35ac13a4-fc0d-4e53-9efe-60474bbc370f';

    // 1. Move the data BACK to correctTargetId (fa8c...)
    console.log(`\nMoving all data from ${wrongSourceId} to ${correctTargetId}...`);

    // Move challenges
    const { data: challenges } = await supabase.from('challenges').update({ user_id: correctTargetId }).eq('user_id', wrongSourceId).select('id');
    console.log(`Moved ${challenges?.length || 0} challenges.`);

    // Move payment orders
    const { data: orders } = await supabase.from('payment_orders').update({ user_id: correctTargetId }).eq('user_id', wrongSourceId).select('id');
    console.log(`Moved ${orders?.length || 0} orders.`);

    // Other data
    await supabase.from('kyc').update({ user_id: correctTargetId }).eq('user_id', wrongSourceId);
    await supabase.from('payouts').update({ user_id: correctTargetId }).eq('user_id', wrongSourceId);
    await supabase.from('referrals').update({ referrer_id: correctTargetId }).eq('referrer_id', wrongSourceId);
    await supabase.from('referrals').update({ referred_id: correctTargetId }).eq('referred_id', wrongSourceId);
    await supabase.from('coupons').update({ created_by: correctTargetId }).eq('created_by', wrongSourceId);
    await supabase.from('affiliate_earnings').update({ affiliate_id: correctTargetId }).eq('affiliate_id', wrongSourceId);
    await supabase.from('user_devices').update({ user_id: correctTargetId }).eq('user_id', wrongSourceId);
    await supabase.from('user_ips').update({ user_id: correctTargetId }).eq('user_id', wrongSourceId);
    await supabase.from('notifications').update({ user_id: correctTargetId }).eq('user_id', wrongSourceId);

    // 2. Fix the emails so correctTargetId becomes "kunthuwealth3004@gmail.com"
    console.log("\nFixing emails...");
    // Move the wrong source out of the way first
    await supabase.auth.admin.updateUserById(wrongSourceId, { email: 'retired_kunnthuwealth3004@gmail.com', email_confirm: true } as any);
    await supabase.from('profiles').update({ email: 'retired_kunnthuwealth3004@gmail.com' }).eq('id', wrongSourceId);

    // Put correct target as desired email
    await supabase.auth.admin.updateUserById(correctTargetId, { email: desiredEmail, email_confirm: true } as any);
    await supabase.from('profiles').update({ email: desiredEmail }).eq('id', correctTargetId);

    console.log(`Success. ${correctTargetId} is now ${desiredEmail} and contains all the data.`);
}

finalMerge();
