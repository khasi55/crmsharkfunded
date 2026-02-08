
import { Worker, Job } from 'bullmq';
import { getRedis } from '../lib/redis';
import { createClient } from '@supabase/supabase-js';
import { fetchMT5Trades } from '../lib/mt5-bridge';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

export async function startTradeSyncWorker() {
    console.log('👷 Trade Sync Worker Started...');

    const worker = new Worker('trade-sync', async (job: Job) => {
        // console.log(`🔨 Processing sync job: ${job.data.login}`);
        await syncAccountTrades(job.data);
    }, {
        connection: getRedis() as any, // Use singleton connection
        concurrency: 10, // Process 10 accounts in parallel per server instance!
        removeOnComplete: { count: 100 }, // Keep only last 100 completed jobs
        removeOnFail: { count: 500 } // Keep last 500 failed for debugging
    });

    worker.on('failed', (job, err) => {
        console.error(`❌ Job ${job?.id} failed: ${err.message}`);
    });
}

// Logic moved from Scheduler
async function syncAccountTrades(data: { login: number, challenge_id: string, user_id: string }) {
    try {
        const { login, challenge_id, user_id } = data;
        const allTrades = await fetchMT5Trades(Number(login));

        if (!allTrades || allTrades.length === 0) return;

        const formattedTrades = allTrades.map((t: any) => ({
            ticket: t.ticket,
            challenge_id: challenge_id,
            user_id: user_id,
            symbol: t.symbol,
            type: t.type === 0 ? 'buy' : t.type === 1 ? 'sell' : 'balance',
            lots: t.volume / 100, // Normalize raw MT5 integer volume (e.g. 4000 -> 40)
            open_price: t.price,
            close_price: t.close_price || null,
            profit_loss: t.profit,
            // Validate timestamps to prevent 1970 dates
            open_time: (t.time && t.time > 0) ? new Date(t.time * 1000).toISOString() : new Date().toISOString(),
            close_time: (t.close_time && t.close_time > 0) ? new Date(t.close_time * 1000).toISOString() : null,
            commission: t.commission,
            swap: t.swap,
        }));

        const uniqueTrades = Array.from(
            formattedTrades.reduce((map: Map<string, any>, trade: any) => {
                const key = `${trade.challenge_id}-${trade.ticket}`;
                map.set(key, trade);
                return map;
            }, new Map()).values()
        );

        await supabase.from('trades').upsert(uniqueTrades, { onConflict: 'challenge_id, ticket' });

        // Notify Risk Engine of updates
        // Notify Risk Engine of updates
        // IMPORTANT: Risk Worker expects RAW MT5 trades (unix time, volume, etc.)
        // Do not send uniqueTrades (formatted). Send allTrades (raw).
        const eventPayload = {
            login: Number(login),
            trades: allTrades, // RAW TRADES
            timestamp: Date.now()
        };
        await getRedis().publish('events:trade_update', JSON.stringify(eventPayload));
        // console.log(`📢 Published trade_update event for ${login} (${uniqueTrades.length} trades)`);

    } catch (e: any) {
        console.error(`⚠️ Failed to sync ${data.login}: ${e.message}`);
        throw e; // Let BullMQ know it failed so it can retry
    }
}
