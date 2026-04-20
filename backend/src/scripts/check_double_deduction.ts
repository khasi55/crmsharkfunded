
import { supabase } from '../lib/supabase';

async function check() {
    const accountId = 'a383a500-bfa3-4315-8453-4b672b7c0009';
    console.log(`--- INVESTIGATING ACCOUNT: ${accountId} ---`);

    const { data: acc } = await supabase.from('challenges').select('*').eq('id', accountId).single();
    if (!acc) return console.log("Account not found");

    console.log(`Initial Balance: $${acc.initial_balance}`);
    console.log(`Current Balance: $${acc.current_balance}`);
    const calculatedProfit = Number(acc.current_balance) - Number(acc.initial_balance);
    console.log(`Calculated Profit (Current - Initial): $${calculatedProfit.toFixed(2)}`);

    const { data: payouts } = await supabase.from('payout_requests')
        .select('*')
        .eq('user_id', acc.user_id)
        .neq('status', 'rejected');

    const accountPayouts = (payouts || []).filter((p: any) => p.metadata?.challenge_id === acc.id);
    console.log(`Payout History for this account:`);
    accountPayouts.forEach(p => {
        console.log(`- ID: ${p.id}, Amount: $${p.amount}, Status: ${p.status}, Requested (Gross): $${p.metadata?.requested_amount}`);
    });

    const totalGrossPaidOrPending = accountPayouts.reduce((sum: number, p: any) => {
        const reqVal = p.metadata?.requested_amount ? Number(p.metadata.requested_amount) : Number(p.amount);
        return sum + reqVal;
    }, 0);
    console.log(`Total Gross Paid/Pending to deduct: $${totalGrossPaidOrPending.toFixed(2)}`);
}

check();
