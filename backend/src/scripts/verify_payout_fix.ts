
import { supabase } from '../lib/supabase';

async function verify() {
    const accountId = 'a383a500-bfa3-4315-8453-4b672b7c0009';
    console.log(`--- VERIFYING PAYOUT LOGIC FOR: ${accountId} ---`);

    // 1. Fetch Account
    const { data: acc } = await supabase.from('challenges').select('*').eq('id', accountId).single();
    if (!acc) return console.log("Account not found");

    const profit = Number(acc.current_balance) - Number(acc.initial_balance);
    console.log(`Gross Profit: $${profit.toFixed(2)}`);

    // 2. Fetch Payouts
    const { data: allPayouts } = await supabase.from('payout_requests')
        .select('*')
        .eq('user_id', acc.user_id)
        .neq('status', 'rejected');

    const accountPayouts = (allPayouts || []).filter((p: any) =>
        p.metadata?.challenge_id === acc.id
    );

    const netPaidOrPending = accountPayouts.reduce((sum: number, p: any) => {
        return sum + Number(p.amount);
    }, 0);
    console.log(`Total Net Paid/Pending: $${netPaidOrPending.toFixed(2)}`);

    // 3. Calculate Available
    let available = Math.max(0, profit * 0.8);
    available = Math.max(0, available - netPaidOrPending);

    console.log(`New Net Available: $${available.toFixed(2)}`);
    console.log(`Old Gross Available (Expected): $${(profit - (accountPayouts.reduce((sum, p) => sum + (p.metadata?.requested_amount || p.amount), 0))).toFixed(2)}`);
}

verify();
