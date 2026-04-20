
import { supabase } from '../lib/supabase';

const email = 'nakodajimandir@gmail.com';

async function checkUser() {
    try {
        console.log(`--- Checking user ${email} ---`);

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .eq('email', email)
            .single();

        if (profileError || !profile) {
            console.error('❌ Error finding profile:', profileError?.message || 'Profile not found');
            return;
        }

        console.log(`✅ User found: ${profile.full_name} (${profile.id})`);

        const { data: wallet } = await supabase
            .from('wallet_addresses')
            .select('*')
            .eq('user_id', profile.id)
            .maybeSingle();

        if (wallet) {
            console.log('ℹ️ Current wallet:', wallet.wallet_address);
            console.log('ℹ️ Is locked:', wallet.is_locked);
        } else {
            console.log('ℹ️ No wallet found for this user.');
        }

        const { data: pendingRequests } = await supabase
            .from('payout_requests')
            .select('id, status, wallet_address')
            .eq('user_id', profile.id)
            .eq('status', 'pending');

        if (pendingRequests && pendingRequests.length > 0) {
            console.log(`ℹ️ Found ${pendingRequests.length} pending payout requests:`);
            console.log(pendingRequests);
        } else {
            console.log('ℹ️ No pending payout requests.');
        }

    } catch (err: any) {
        console.error('ERROR:', err.message);
    }
}

checkUser();
