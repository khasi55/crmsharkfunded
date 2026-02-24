import { supabase } from '../lib/supabase';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const loginId = '900909494245';

async function investigate() {
    const { data: challenge } = await supabase
        .from('challenges')
        .select('*')
        .eq('login', loginId)
        .single();

    console.log('Challenge Stats:', {
        initial_balance: challenge.initial_balance,
        current_balance: challenge.current_balance,
        current_equity: challenge.current_equity,
        start_of_day_equity: challenge.start_of_day_equity
    });

    const { data: trades } = await supabase
        .from('trades')
        .select('*')
        .eq('challenge_id', challenge.id);

    console.log(`\nFound ${trades?.length} trades:`);
    let totalProfit = 0;
    let totalCommission = 0;
    let totalSwap = 0;

    trades?.forEach(t => {
        console.log(`Ticket: ${t.ticket}, Symbol: ${t.symbol}, Type: ${t.type}, Profit: ${t.profit_loss}, Commission: ${t.commission}, Swap: ${t.swap}`);
        totalProfit += Number(t.profit_loss);
        totalCommission += Number(t.commission || 0);
        totalSwap += Number(t.swap || 0);
    });

    console.log('\nTotals:');
    console.log(`Total Profit/Loss: ${totalProfit}`);
    console.log(`Total Commission: ${totalCommission}`);
    console.log(`Total Swap: ${totalSwap}`);
    console.log(`Net P&L: ${totalProfit + totalCommission + totalSwap}`);
    console.log(`Calculated Balance: ${Number(challenge.initial_balance) + totalProfit + totalCommission + totalSwap}`);
}

investigate();
