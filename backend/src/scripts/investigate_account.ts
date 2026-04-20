
import { supabase } from '../lib/supabase';

async function run() {
    const accountId = 'a383a500-bfa3-4315-8453-4b672b7c0009';
    console.log(`--- INVESTIGATING ACCOUNT: ${accountId} ---`);

    // Fetch account
    const { data: account } = await supabase.from('challenges').select('*').eq('id', accountId).single();
    console.log("Account Details:", JSON.stringify(account, null, 2));

    // Fetch payouts
    const { data: payouts } = await supabase.from('payout_requests').select('*').filter('metadata->>challenge_id', 'eq', accountId);
    console.log("\nPayout Requests (Filtered by Metadata):", JSON.stringify(payouts, null, 2));

    // Fetch all payouts for the user just in case metadata is missing challenge_id
    if (account) {
        const { data: userPayouts } = await supabase.from('payout_requests').select('*').eq('user_id', account.user_id);
        console.log("\nAll User Payout Requests:", JSON.stringify(userPayouts, null, 2));
    }
}

run();
