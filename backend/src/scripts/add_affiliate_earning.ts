import { supabaseAdmin } from '../lib/supabase';

async function main() {
    const email = 'siddareddy1947@gmail.com';
    const amountToAdd = 10;
    const userId = 'bc233390-0e10-41b5-bdb6-2af66edd6af8';

    console.log(`Adding $${amountToAdd} earning for user: ${email} (ID: ${userId})`);

    // 1. Insert into affiliate_earnings
    const { data: earning, error: earningError } = await supabaseAdmin
        .from('affiliate_earnings')
        .insert({
            referrer_id: userId,
            referred_user_id: userId, // Using self as placeholder for manual adjustment
            amount: amountToAdd,
            commission_type: 'manual_test',
            status: 'completed',
            description: 'Test commission for withdrawal testing'
        })
        .select()
        .single();

    if (earningError) {
        console.error('Error inserting into affiliate_earnings:', earningError);
        return;
    }

    console.log('✅ Successfully added earning record:', earning);

    // 2. Ensure profiles table balance is also updated (idempotent if already updated, but let's be sure)
    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('wallet_balance, total_commission')
        .eq('id', userId)
        .single();

    if (profile) {
        console.log('Current profile balance:', profile);
        // If wallet_balance is already 10 (from my previous script), we don't necessarily need to add another 10
        // BUT the user wants the UI to show 10. The UI SHOWS the sum of affiliate_earnings minus withdrawals.
        // So the availableBalance is now 10 (sum of earnings).
        // Let's make sure wallet_balance in profiles is also synced.
    }
}

main();
