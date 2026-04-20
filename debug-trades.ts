
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from backend
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function debugTrades(challengeId: string) {
    const { data: trades, error } = await supabase
        .from('trades')
        .select('*')
        .eq('challenge_id', challengeId)
        .order('close_time', { ascending: true });

    if (error) {
        console.error('Error fetching trades:', error);
        return;
    }

    console.log(`\n--- Trades for Challenge: ${challengeId} ---`);
    console.log(`Total Trades: ${trades.length}`);

    const dailyStats: Record<string, { net: number, count: number }> = {};
    let totalNet = 0;

    trades.forEach(trade => {
        if (!trade.close_time) return;

        const closeDate = new Date(trade.close_time);
        const dateStr = closeDate.toISOString().split('T')[0];
        const net = (Number(trade.profit_loss) || 0) + (Number(trade.commission) || 0) + (Number(trade.swap) || 0);

        if (!dailyStats[dateStr]) dailyStats[dateStr] = { net: 0, count: 0 };
        dailyStats[dateStr].net += net;
        dailyStats[dateStr].count += 1;
        totalNet += net;

        console.log(`[${trade.close_time}] Net: ${net.toFixed(2)} (P/L: ${trade.profit_loss}, Comm: ${trade.commission}, Swap: ${trade.swap})`);
    });

    console.log('\n--- Daily Summary (UTC) ---');
    Object.entries(dailyStats).forEach(([date, stats]) => {
        console.log(`${date}: $${stats.net.toFixed(2)} (${stats.count} trades)`);
    });
    console.log(`\nTotal Settled PnL: $${totalNet.toFixed(2)}`);
}

const challengeId = 'c9acd9de-a9a4-44ba-91e0-33a90233d30f';
debugTrades(challengeId);
