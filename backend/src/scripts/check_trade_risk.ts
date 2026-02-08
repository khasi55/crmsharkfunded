
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkTrade(id: string) {
    console.log(`🔍 Checking ID: ${id}`);

    // 1. Check as Ticket in Trades
    const { data: trade, error: tradeError } = await supabase
        .from('trades')
        .select('*')
        .eq('ticket', id)
        .maybeSingle();

    if (trade) {
        console.log(`✅ Found Trade (Ticket: ${id})`);
        console.table([trade]);

        // Check for flags
        const { data: flags } = await supabase
            .from('advanced_risk_flags')
            .select('*')
            .eq('trade_ticket', id);

        if (flags && flags.length > 0) {
            console.log(`🚩 Found ${flags.length} Risk Flags:`);
            console.table(flags);
        } else {
            console.log("✅ No Risk Flags found for this trade.");
        }
        return;
    }

    // 2. Check as Login in Challenges
    const { data: challenge, error: challengeError } = await supabase
        .from('challenges')
        .select('*')
        .eq('login', id)
        .maybeSingle();

    if (challenge) {
        console.log(`✅ Found Account (Login: ${id})`);
        console.table([challenge]);

        // Check for flags
        const { data: flags } = await supabase
            .from('advanced_risk_flags')
            .select('*')
            .eq('challenge_id', challenge.id);

        if (flags && flags.length > 0) {
            console.log(`🚩 Found ${flags.length} Risk Flags for this account:`);
            console.table(flags);
        } else {
            console.log("✅ No Risk Flags found for this account.");
        }

        // List recent trades
        const { data: trades } = await supabase
            .from('trades')
            .select('*')
            .eq('challenge_id', challenge.id)
            .order('close_time', { ascending: false })
            .limit(10);

        if (trades && trades.length > 0) {
            console.log(`📊 Last ${trades.length} Trades:`);
            console.table(trades.map(t => ({
                ticket: t.ticket,
                type: t.type,
                lots: t.lots,
                profit: t.profit_loss,
                open_time: t.open_time,
                close_time: t.close_time,
                duration: t.close_time ? (new Date(t.close_time).getTime() - new Date(t.open_time).getTime()) / 1000 + 's' : 'OPEN'
            })));
        } else {
            console.log("No trades found.");
        }

        return;
    }

    console.log("❌ ID not found as Trade Ticket or Account Login.");
}

const id = process.argv[2];
if (id) {
    checkTrade(id);
} else {
    console.log("Please provide an ID.");
}
