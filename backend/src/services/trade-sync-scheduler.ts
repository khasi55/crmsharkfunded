import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { redis } from '../lib/redis';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);
const BRIDGE_URL = process.env.BRIDGE_URL || 'https://2b267220ca1b.ngrok-free.app';

const SYNC_INTERVAL_MS = 3 * 60 * 1000; // 3 minutes

export function startTradeSyncScheduler() {
    console.log(`⏳ Trade Sync Scheduler started (Bulk Mode). Interval: ${SYNC_INTERVAL_MS / 1000}s`);
    runTradeSync();
    setInterval(runTradeSync, SYNC_INTERVAL_MS);
}

let isSyncing = false;

async function runTradeSync() {
    if (isSyncing) {
        console.log("⚠️ [Trade Sync] Previous cycle still running. Skipping this tick.");
        return;
    }
    isSyncing = true;
    try {
        console.log("🔄 [Trade Apps] Starting Bulk Sync Cycle...");

        // 1. Fetch Active Challenges
        const { data: challenges, error } = await supabase
            .from('challenges')
            .select('id, user_id, login')
            .eq('status', 'active');

        if (error || !challenges || challenges.length === 0) return;

        // 2. Process in Batches (e.g. 50 accounts per HTTP request)
        const BATCH_SIZE = 50;
        for (let i = 0; i < challenges.length; i += BATCH_SIZE) {
            const batch = challenges.slice(i, i + BATCH_SIZE);
            await processBatch(batch);

            // Rate limit: Sleep 200ms between batches
            if (i + BATCH_SIZE < challenges.length) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }

        console.log(`✅ [Trade Sync] Cycle Complete. Synced ${challenges.length} accounts.`);

    } catch (e) {
        console.error("❌ [Trade Sync] Cycle Error:", e);
    } finally {
        isSyncing = false;
    }
}

async function processBatch(challenges: any[], attempt = 1) {
    const MAX_RETRIES = 3;
    try {
        const logins = challenges.map(c => Number(c.login));
        const challengeMap = new Map(challenges.map(c => [Number(c.login), c]));

        // Call Python Bulk Endpoint with Timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

        try {
            const response = await fetch(`${BRIDGE_URL}/fetch-trades-bulk`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ logins, incremental: true }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status} ${response.statusText}`);
            }

            const data = await response.json() as { trades: any[] };
            const trades = data.trades || [];

            if (trades.length === 0) return;

            // Format trades for DB
            const formattedTrades = trades.map((t: any) => {
                const challenge = challengeMap.get(t.login);
                if (!challenge) return null;

                return {
                    ticket: t.ticket,
                    challenge_id: challenge.id,
                    user_id: challenge.user_id,
                    symbol: t.symbol,
                    type: t.type === 0 ? 'buy' : t.type === 1 ? 'sell' : 'balance',
                    lots: t.volume,
                    open_price: t.price,
                    close_price: t.close_price || null,
                    profit_loss: t.profit,
                    open_time: new Date(t.time * 1000).toISOString(),
                    close_time: t.close_time ? new Date(t.close_time * 1000).toISOString() : null,
                    commission: t.commission,
                    swap: t.swap,
                };
            }).filter((t: any) => t !== null);

            if (formattedTrades.length > 0) {
                // Upsert to Supabase
                const { error } = await supabase.from('trades').upsert(formattedTrades, { onConflict: 'challenge_id, ticket' });

                if (error) {
                    console.error("❌ Bulk Upsert Failed:", error);
                } else {
                    const uniqueLogins = new Set(trades.map((t: any) => t.login));
                    for (const login of Array.from(uniqueLogins)) {
                        const accountTrades = formattedTrades.filter((ft: any) => {
                            const c = challengeMap.get(Number(login));
                            return c && ft.challenge_id === c.id;
                        });

                        if (accountTrades.length > 0) {
                            const eventPayload = {
                                login: Number(login),
                                trades: accountTrades,
                                timestamp: Date.now()
                            };
                            await redis.publish('events:trade_update', JSON.stringify(eventPayload));
                        }
                    }
                }
            }
        } catch (err: any) {
            clearTimeout(timeoutId);
            throw err;
        }

    } catch (e: any) {
        if (attempt <= MAX_RETRIES) {
            console.warn(`⚠️ Batch failed (Attempt ${attempt}/${MAX_RETRIES}). Retrying in 1s...`, e.message);
            await new Promise(resolve => setTimeout(resolve, 1000));
            return processBatch(challenges, attempt + 1);
        } else {
            console.error(`❌ Error processing batch after ${MAX_RETRIES} attempts:`, e);
        }
    }
}
