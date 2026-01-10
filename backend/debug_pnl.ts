import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const LOGIN = 566971;
const BRIDGE_URL = process.env.BRIDGE_URL || 'http://localhost:8000';

async function main() {
    console.log(`🔍 Investigating Account: ${LOGIN}`);

    // 1. Fetch DB State
    const { data: account, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('login', LOGIN)
        .single();

    if (error) {
        console.error("❌ DB Error:", error.message);
        return;
    }

    console.log("\n📊 [Database State]");
    console.log(`Initial Balance: ${account.initial_balance}`);
    console.log(`Current Balance: ${account.current_balance}`);
    console.log(`Current Equity:  ${account.current_equity}`);

    const equityPnL = account.current_equity - account.initial_balance;
    const balancePnL = account.current_balance - account.initial_balance;
    console.log(`👉 Equity PnL: ${equityPnL.toFixed(2)}`);
    console.log(`👉 Balance PnL: ${balancePnL.toFixed(2)}`);


    console.log(`\n📚 [Supabase Trade History Check]`);
    const { data: dbTrades, error: trError } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', account.user_id)
        // Note: 'trades' table usually links via 'challenge_id' or 'login'? 
        // Let's check schema. Usually 'challenge_id'.
        .eq('challenge_id', account.id);

    if (trError) console.error("DB Trade Fetch Error:", trError);
    else {
        console.log(`Found ${dbTrades.length} trades in DB.`);
        let dbSum = 0;
        let dbComm = 0;
        let dbSwap = 0;

        dbTrades.forEach((t: any) => {
            // Only closed trades (type buy/sell/balance?)
            // DB 'profit_loss' usually implies net result? Or raw profit?
            // Let's assume raw profit + commission + swap columns exist.
            // Schema check: t.profit_loss, t.commission, t.swap.

            // In DB, 'profit_loss' is usually the main PnL column.
            // Let's sum everything using the same logic as frontend.
            if (t.close_time) {
                dbSum += (t.profit_loss || 0) + (t.commission || 0) + (t.swap || 0);
                dbComm += (t.commission || 0);
                dbSwap += (t.swap || 0);
            }
        });

        console.log(`👉 DB Trades Sum (Realized): ${dbSum.toFixed(2)}`);
        console.log(`   (Comm: ${dbComm}, Swap: ${dbSwap})`);
        console.log(`Difference (Equity - DB Sum): ${(equityPnL - dbSum).toFixed(2)}`);
    }

    // 2. Fetch Live Trades from Bridge (Attempt)
    console.log(`\n🌉 [Bridge Check] Fetching trades from ${BRIDGE_URL}...`);
    try {
        const res = await axios.post(`${BRIDGE_URL}/fetch-trades`, {
            login: LOGIN,
            incremental: false
        });

        const trades = res.data.trades || [];
        console.log(`fetched ${trades.length} trades.`);

        let sumProfit = 0;
        let sumComm = 0;
        let sumSwap = 0;
        let closedCount = 0;

        trades.forEach((t: any) => {
            if (t.is_closed) {
                sumProfit += t.profit;
                sumComm += t.commission;
                sumSwap += t.swap;
                closedCount++;
            }
        });

        const realizedPnL = sumProfit + sumComm + sumSwap;

        console.log("\n💰 [Realized PnL Calculation (Closed Trades)]");
        console.log(`Closed Trades: ${closedCount}`);
        console.log(`Gross Profit:  ${sumProfit.toFixed(2)}`);
        console.log(`Commission:    ${sumComm.toFixed(2)}`);
        console.log(`Swap:          ${sumSwap.toFixed(2)}`);
        console.log(`--------------------------`);
        console.log(`👉 NET REALIZED: ${realizedPnL.toFixed(2)}`);

        console.log(`\n📉 Discrepancy Analysis:`);
        console.log(`User Claims:      UNKNOWN (-801?)`);
        console.log(`Equity PnL (DB):  ${equityPnL.toFixed(2)}`);
        console.log(`Realized (Sum):   ${realizedPnL.toFixed(2)}`);
        console.log(`Difference:       ${(equityPnL - realizedPnL).toFixed(2)} (Likely open positions or unsynced data)`);


    } catch (e: any) {
        console.error("❌ Bridge Error:", e.message);
        if (e.response) console.log(e.response.data);
    }
}

main();
