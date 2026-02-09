
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Fix for missing Process Env in some environments
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing Supabase credentials in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkAccount(login: string) {
    console.log(`🔍 Checking Account: ${login}...`);

    // 1. Check Challenges Table
    const { data: challenge, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('login', login)
        .single();

    if (error) {
        console.error("Error finding account:", error.message);
        return;
    }

    if (!challenge) {
        console.log("❌ Account not found in 'challenges' table.");
        return;
    }

    // 1b. Fetch User Profile
    const { data: profile, error: pError } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', challenge.user_id)
        .single();

    if (pError) {
        console.warn(`⚠️ Warning: Could not fetch user profile for ID ${challenge.user_id}: ${pError.message}`);
    }

    console.log("\n✅ Account Found:");
    console.log(`- ID: ${challenge.id}`);
    console.log(`- Login: ${challenge.login}`);
    console.log(`- User ID: ${challenge.user_id}`);
    console.log(`- Name: ${profile?.full_name || 'Unknown'}`);
    console.log(`- Email: ${profile?.email || 'Unknown'}`);
    console.log(`- Group: ${challenge.group}`);
    console.log(`- Status: ${challenge.status}`);
    console.log(`- Type: ${challenge.challenge_type}`);
    console.log(`- Initial Balance: ${challenge.initial_balance}`);
    console.log(`- Balance: ${challenge.current_balance}`);
    console.log(`- Equity: ${challenge.current_equity}`);
    console.log(`- SOD Equity: ${challenge.start_of_day_equity}`);
    console.log(`- Leverage: ${challenge.leverage}`);
    console.log(`- Created At: ${challenge.created_at}`);

    // Calculates Daily Drawdown Limit (3% based on logs? Or common rule?)
    // Assuming 3% daily drawdown for demo
    const sod = challenge.start_of_day_equity;
    const computedLimit = sod * (1 - 0.03);
    console.log(`- Computed Daily DD Limit (~3%): ${computedLimit.toFixed(2)}`);


    // 2. Check for Breaches
    const { data: breach, error: bError } = await supabase
        .from('account_breaches')
        .select('*')
        .eq('challenge_id', challenge.id)
        .order('created_at', { ascending: false })
        .limit(1);

    if (breach && breach.length > 0) {
        console.log(`\n⚠️ LAST BREACH: ${breach[0].breach_type} on ${breach[0].created_at}`);
        console.log(`- Value: ${breach[0].breach_value}`);
        console.log(`- Reason: ${breach[0].metadata?.reason || 'No reason'}`);
    } else {
        console.log("\n✅ No breaches recorded.");
    }

    // 3. Check Recent Trades (FIXED: Query by challenge_id, NOT login)
    const { data: trades, error: tError } = await supabase
        .from('trades')
        .select('ticket, open_time, close_time, profit_loss, type, symbol, lots')
        .eq('challenge_id', challenge.id)
        .order('close_time', { ascending: false })
        .limit(20);

    if (tError) {
        console.error("\n❌ Error fetching trades:", tError.message);
    } else if (trades && trades.length > 0) {
        console.log(`\nRecent ${trades.length} Trades:`);
        trades.forEach(t => {
            console.log(`- Ticket ${t.ticket}: ${t.type} ${t.symbol} (${t.lots}) | P/L: ${t.profit_loss} | Open: ${t.open_time} | Closed: ${t.close_time}`);
        });
    } else {
        console.log("\nℹ️ No trades found.");
    }
}

const loginToCheck = process.argv[2] || '900909491276';
checkAccount(loginToCheck);
