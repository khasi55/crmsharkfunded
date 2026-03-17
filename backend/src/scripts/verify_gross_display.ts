
import { supabase } from '../lib/supabase';

async function verify() {
    const accountId = 'a383a500-bfa3-4315-8453-4b672b7c0009';
    console.log(`--- VERIFYING GROSS DISPLAY FOR: ${accountId} ---`);

    const { data: acc } = await supabase.from('challenges').select('*').eq('id', accountId).single();
    if (!acc) return console.log("Account not found");

    const profit = Number(acc.current_balance) - Number(acc.initial_balance);
    const { data: allPayouts } = await supabase.from('payout_requests').select('*').eq('user_id', acc.user_id).neq('status', 'rejected');

    const accountPayouts = (allPayouts || []).filter((p: any) => p.metadata?.challenge_id === acc.id);
    const grossPaidOrPending = accountPayouts.reduce((sum: number, p: any) => {
        const reqVal = p.metadata?.requested_amount ? Number(p.metadata.requested_amount) : Number(p.amount);
        return sum + reqVal;
    }, 0);

    const available = Math.max(0, profit);
    console.log(`Gross Profit (Remaining on account): $${profit.toFixed(2)}`);
    console.log(`Gross Already Requested (Deducted from MT5): $${grossPaidOrPending.toFixed(2)}`);
    console.log(`Resulting Gross Available: $${available.toFixed(2)}`);
    console.log(`Expected (User Instruction): $195.32`);
}

verify();
