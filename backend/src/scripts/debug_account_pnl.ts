import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugAccount(login: string) {
    console.log(`\n🔍 Debugging Account: ${login}`);

    // 1. Fetch Challenge
    const { data: challenge, error: challengeError } = await supabase
        .from('challenges')
        .select('*')
        .eq('login', Number(login))
        .maybeSingle();

    if (challengeError) {
        console.error('Error fetching challenge:', challengeError);
        return;
    }

    if (!challenge) {
        console.log('No challenge found for this login.');
        return;
    }

    console.log('\n--- Challenge Data ---');
    console.log(`ID: ${challenge.id}`);
    console.log(`Account Number: ${challenge.account_number}`);
    console.log(`Initial Balance: ${challenge.initial_balance}`);
    console.log(`Current Balance: ${challenge.balance}`);
    console.log(`Current Equity: ${challenge.current_equity}`);
    console.log(`Status: ${challenge.status}`);
    console.log(`Start of Day Equity: ${challenge.start_of_day_equity}`);

    // 2. Fetch Trades
    const { data: trades, error: tradesError } = await supabase
        .from('trades')
        .select('*')
        .eq('challenge_id', challenge.id)
        .order('close_time', { ascending: true });

    if (tradesError) {
        console.error('Error fetching trades:', tradesError);
        return;
    }

    console.log(`\n--- Trades (${trades.length}) ---`);

    let sumProfitLoss = 0;
    let sumCommission = 0;
    let sumSwap = 0;
    let tradeCount = 0;

    trades.forEach(t => {
        const comment = (t.comment || '').toLowerCase();
        const symbol = (t.symbol || '');
        const isNonTrade = comment.includes('deposit') ||
            comment.includes('balance') ||
            comment.includes('initial') ||
            symbol.trim() === '' ||
            symbol === 'BALANCE' ||
            symbol === '#N/A' ||
            Number(t.lots) === 0;

        if (!isNonTrade) {
            tradeCount++;
            sumProfitLoss += Number(t.profit_loss) || 0;
            sumCommission += Number(t.commission) || 0;
            sumSwap += Number(t.swap) || 0;
        } else {
            console.log(`[Non-Trade] ${t.comment} | Profit: ${t.profit_loss}`);
        }
    });

    console.log(`\n--- Last 20 Trades ---`);
    const lastTrades = trades.slice(-20);
    lastTrades.forEach(t => {
        const net = (Number(t.profit_loss) || 0) + (Number(t.commission) || 0) + (Number(t.swap) || 0);
        console.log(`[${t.close_time}] ${t.symbol} ${t.type} ${t.lots} | PnL: ${t.profit_loss} | Comm: ${t.commission} | Net: ${net.toFixed(2)} | Comment: ${t.comment}`);
    });

    const netTradingPnL = sumProfitLoss + sumCommission + sumSwap;
    const accountPnL = Number(challenge.current_equity) - Number(challenge.initial_balance);

    console.log(`\n--- Summary ---`);
    console.log(`Valid Trading Trades: ${tradeCount}`);
    console.log(`Sum Profit/Loss: ${sumProfitLoss.toFixed(2)}`);
    console.log(`Sum Commission: ${sumCommission.toFixed(2)}`);
    console.log(`Sum Swap: ${sumSwap.toFixed(2)}`);
    console.log(`Net Trading PnL (Sum): ${netTradingPnL.toFixed(2)}`);
    console.log(`Double Commission Check (Net PnL with *2 Comm): ${(sumProfitLoss + (sumCommission * 2) + sumSwap).toFixed(2)}`);
    console.log(`Account PnL (Equity - Initial): ${accountPnL.toFixed(2)}`);
    console.log(`Discrepancy: ${(accountPnL - netTradingPnL).toFixed(2)}`);
}

const login = process.argv[2] || '900909493029';
debugAccount(login);
