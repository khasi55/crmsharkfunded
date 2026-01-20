
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function main() {
    const login = process.argv[2] ? parseInt(process.argv[2]) : 889224461;
    const dateStr = '2026-01-19';
    const startOfDay = new Date(`${dateStr}T00:00:00Z`).toISOString();
    const endOfDay = new Date(`${dateStr}T23:59:59Z`).toISOString();

    console.log(`🔍 Analyzing trades for account ${login} on ${dateStr}...`);

    // 1. Get Challenge ID
    const { data: challenge, error: cError } = await supabase
        .from('challenges')
        .select('id')
        .eq('login', login)
        .single();

    if (cError || !challenge) {
        console.error("❌ Error fetching challenge:", cError);
        return;
    }

    const challengeId = challenge.id;
    console.log(`✅ Found Challenge ID: ${challengeId}`);

    // 2. Fetch Trades
    const { data: trades, error } = await supabase
        .from('trades')
        .select('*')
        .eq('challenge_id', challengeId)
        .gte('close_time', startOfDay) // trade closed within the day
        .lte('close_time', endOfDay)
        .order('close_time', { ascending: true });

    if (error) {
        console.error("❌ Error fetching trades:", error);
        return;
    }

    if (!trades || trades.length === 0) {
        console.log("⚠️ No closed trades found for this date.");
    } else {
        console.log(`✅ Found ${trades.length} closed trades.`);
        let totalProfit = 0;
        trades.forEach(t => {
            const p = Number(t.profit_loss);
            totalProfit += p;
            console.log(`   - [${t.close_time}] Ticket: ${t.ticket} | Symbol: ${t.symbol} | Type: ${t.type} | Lots: ${t.lots} | Profit: ${p}`);
        });
        console.log(`\n💰 Total Profit for ${dateStr}: ${totalProfit.toFixed(2)}`);
    }
}

main();
