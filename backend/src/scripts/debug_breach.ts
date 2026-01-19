
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function main() {
    const login = '889224450';
    console.log(`Checking breach reason for login: ${login}`);

    // 1. Get Challenge Details
    const { data: challenge } = await supabase
        .from('challenges')
        .select(`
            id, 
            status, 
            initial_balance, 
            current_equity, 
            current_balance, 
            start_of_day_equity, 
            metadata
        `)
        .eq('login', login)
        .single();

    if (!challenge) {
        console.log('Challenge not found');
        return;
    }

    console.log("Account State:");
    console.log(JSON.stringify(challenge, null, 2));

    // 2. Calculate Drawdown
    const initial = challenge.initial_balance;
    const currentEq = challenge.current_equity;
    const sod = challenge.start_of_day_equity;

    const maxDrawdown = initial - currentEq;
    const dailyDrawdown = sod - currentEq;

    console.log("-----------------------------------");
    console.log(`Initial Balance: ${initial}`);
    console.log(`SOD Equity:      ${sod}`);
    console.log(`Current Equity:  ${currentEq}`);
    console.log(`Max Drawdown:    ${maxDrawdown.toFixed(2)} (${((maxDrawdown / initial) * 100).toFixed(2)}%)`);
    console.log(`Daily Drawdown:  ${dailyDrawdown.toFixed(2)} (${((dailyDrawdown / sod) * 100).toFixed(2)}%)`);
    console.log("-----------------------------------");

    // 3. Fetch recent trades to see what happened
    // 3. Fetch all trades to analyze recent history
    const { data: trades } = await supabase
        .from('trades')
        .select('*')
        .eq('challenge_id', challenge.id)
        .order('close_time', { ascending: false });

    // We expect the script runs on "Today". Check metadata for server time if possible, otherwise use local system time.
    // The previous output showed close_time: 2026-01-19T09:17:15+00:00 (which is today in UTC).

    // Manual Grouping
    const todayStr = "2026-01-19";
    const yesterdayStr = "2026-01-18";

    const todayTrades = trades?.filter(t => t.close_time?.startsWith(todayStr)) || [];
    const yesterdayTrades = trades?.filter(t => t.close_time?.startsWith(yesterdayStr)) || [];

    console.log(`\n📅 TODAY'S TRADES (${todayStr}):`);
    let todayPL = 0;
    todayTrades.forEach(t => {
        console.log(`[${t.close_time.split('T')[1].split('.')[0]}] Ticket: ${t.ticket} | Type: ${t.type} | Lots: ${t.lots} | P/L: ${t.profit_loss} `);
        todayPL += (t.profit_loss || 0);
    });
    console.log(`>> TOTAL P/L TODAY (Realized): $${todayPL.toFixed(2)}`);

    console.log(`\n📅 YESTERDAY'S TRADES (${yesterdayStr}):`);
    let yesterdayPL = 0;
    yesterdayTrades.forEach(t => {
        console.log(`[${t.close_time.split('T')[1].split('.')[0]}] Ticket: ${t.ticket} | Type: ${t.type} | Lots: ${t.lots} | P/L: ${t.profit_loss}`);
        yesterdayPL += (t.profit_loss || 0);
    });
    console.log(`>> TOTAL P/L YESTERDAY: $${yesterdayPL.toFixed(2)}`);
}

main();
