
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function listTrades() {
    console.log("🕵️ Listing Recent Trades (< 60s Duration)...");

    // Fetch trades closed in last 24 hours
    const { data: trades, error } = await supabase
        .from('trades')
        .select('ticket, challenge_id, symbol, open_time, close_time, profit_loss')
        .not('close_time', 'is', null)
        .order('close_time', { ascending: false })
        .limit(50);

    if (error) {
        console.error("Error:", error);
        return;
    }

    console.log("Found Recent Trades:");
    trades?.forEach(t => {
        const duration = (new Date(t.close_time).getTime() - new Date(t.open_time).getTime()) / 1000;
        if (duration < 60) {
            console.log(`⚠️ SHORT DURATION: Ticket ${t.ticket} | Challenge ${t.challenge_id} | ${duration}s | Profit: ${t.profit_loss}`);
        } else {
            // console.log(`Ticket ${t.ticket} | ${duration}s`);
        }
    });
}

listTrades();
