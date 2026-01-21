
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function main() {
    const login = '889224437';
    console.log(`Checking SOD status for account: ${login}`);

    const { data: challenge, error } = await supabase
        .from('challenges')
        .select('id, login, status, initial_balance, start_of_day_equity, current_equity, current_balance, updated_at, created_at')
        .eq('login', login)
        .single();

    if (error) {
        console.error("Error fetching account:", error);
        return;
    }

    if (!challenge) {
        console.log("Account not found.");
        return;
    }

    console.log("--------------------------------------------------");
    console.log(`Login:              ${challenge.login}`);
    console.log(`Status:             ${challenge.status}`);
    console.log(`Initial Balance:    ${challenge.initial_balance}`);
    console.log(`Start of Day Equity:${challenge.start_of_day_equity}`);
    console.log(`Current Balance:    ${challenge.current_balance}`);
    console.log(`Current Equity:     ${challenge.current_equity}`);
    console.log("--------------------------------------------------");

    const dailyDrawdown = challenge.start_of_day_equity - challenge.current_equity;
    const dailyDrawdownPercent = (dailyDrawdown / challenge.start_of_day_equity) * 100;

    console.log(`Daily Drawdown:     ${dailyDrawdown.toFixed(2)} (${dailyDrawdownPercent.toFixed(2)}%)`);

    // "As it was new day" - Hypothetically, if a new day started NOW, the SOD would be the Current Equity.
    console.log(`\nIf New Day Started NOW:`);
    console.log(`New SOD Equity would be: ${challenge.current_equity}`);

    // Fetch Trades
    const { data: trades } = await supabase
        .from('trades')
        .select('*')
        .eq('challenge_id', challenge.id)
        .order('close_time', { ascending: false });

    if (trades && trades.length > 0) {
        console.log(`\nRecent Trades:`);
        trades.slice(0, 10).forEach(t => {
            console.log(`[${t.close_time}] Ticket: ${t.ticket} | P/L: ${t.profit_loss}`);
        });
    } else {
        console.log("\nNo trades found.");
    }

    console.log("--------------------------------------------------");
    console.log(`Server System Time: ${new Date().toISOString()}`);
    console.log(`Account Created At: ${challenge.created_at}`);
    console.log(`Account Updated At: ${challenge.updated_at}`);

    // Check System Logs for Reset
    const { data: logs } = await supabase
        .from('system_logs')
        .select('*')
        .ilike('message', '%Daily Reset%')
        .order('created_at', { ascending: false })
        .limit(5);

    if (logs && logs.length > 0) {
        console.log(`\nRecent Daily Reset Logs:`);
        logs.forEach(l => {
            console.log(`[${l.created_at}] ${l.message}`);
        });
    } else {
        console.log("\nNo recent Daily Reset logs found.");
    }
}

main();
