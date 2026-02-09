
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing Supabase credentials in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkTiming(login: string) {
    console.log(`🔍 Checking Timing for Account: ${login}...`);

    // 1. Fetch Challenge Details
    const { data: challenge, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('login', login)
        .single();

    if (error || !challenge) {
        console.error("❌ Challenge not found");
        return;
    }

    console.log("\n--------- Challenge State ---------");
    console.log(`Updated At: ${challenge.updated_at}`);
    console.log(`SOD Equity: ${challenge.start_of_day_equity}`);
    console.log(`Current Equity: ${challenge.current_equity}`);
    console.log(`Current Balance: ${challenge.current_balance}`);

    // 2. Fetch specific trade 8120684
    const { data: trade } = await supabase
        .from('trades')
        .select('*')
        .eq('ticket', '8120684')
        .single();

    if (trade) {
        console.log("\n--------- Trade 8120684 ---------");
        console.log(`Open Time: ${trade.open_time}`);
        console.log(`Close Time: ${trade.close_time}`);
        console.log(`Profit: ${trade.profit_loss}`);
    } else {
        console.log("\n❌ Trade 8120684 not found in DB");
    }

    // 3. Fetch all trades for context
    const { data: trades } = await supabase
        .from('trades')
        .select('ticket, close_time, profit_loss')
        .eq('challenge_id', challenge.id)
        .order('close_time', { ascending: false })
        .limit(5);

    console.log("\n--------- Recent Closed Trades ---------");
    trades?.forEach(t => {
        console.log(`Ticket ${t.ticket}: Closed ${t.close_time} (P/L: ${t.profit_loss})`);
    });

}

const loginToCheck = process.argv[2] || '900909491276';
checkTiming(loginToCheck);
