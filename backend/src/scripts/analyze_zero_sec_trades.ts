
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function analyzeZeroSecTrades() {
    console.log("🔍 Fetching sample 0-second trades...");

    // Find trades where open_time and close_time are approximately equal
    // In SQL: SELECT * FROM trades WHERE close_time = open_time LIMIT 10;
    // Since they are Timestamps, we might need to check if duration is 0

    // Let's try to find them by ticket if we have some from previous flag search
    // Or just query the trades table directly
    const { data: trades, error } = await supabase
        .from('trades')
        .select('*')
        .not('close_time', 'is', null)
        .limit(20);

    if (error) {
        console.error("❌ Error fetching trades:", error);
        return;
    }

    const zeroSecTrades = trades.filter(t => {
        const duration = (new Date(t.close_time).getTime() - new Date(t.open_time).getTime()) / 1000;
        return duration === 0;
    });

    if (zeroSecTrades.length === 0) {
        console.log("ℹ️ No 0-second trades found in the first 20 records. Searching specifically for them...");
        // This is harder via JS filter if there are millions of trades.
        // We can use a raw SQL approach or just check the advanced_risk_flags metadata if it was stored.
    } else {
        console.log(`📊 Found ${zeroSecTrades.length} zero-second trades in sample.`);
        zeroSecTrades.forEach(t => {
            console.log(`Ticket: ${t.ticket_number} | Symbol: ${t.symbol} | Lots: ${t.lots} | PnL: ${t.profit_loss} | Comment: ${t.comment}`);
        });
    }

    // Checking metadata of a few flags might be easier
    const { data: flags } = await supabase
        .from('advanced_risk_flags')
        .select('*')
        .eq('flag_type', 'tick_scalping')
        .limit(5);

    if (flags && flags.length > 0) {
        console.log("\n🚩 Sample Risk Flags Meta:");
        flags.forEach(f => {
            console.log(`Ticket: ${f.trade_ticket} | Desc: ${f.description} | Symbol: ${f.symbol}`);
        });
    }
}

analyzeZeroSecTrades().catch(console.error);
