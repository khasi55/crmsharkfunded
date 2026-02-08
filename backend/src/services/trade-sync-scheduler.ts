import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { getRedis } from '../lib/redis';
import { fetchMT5Trades } from '../lib/mt5-bridge';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes (Increased frequency for Advanced Risk checks)

export function startTradeSyncScheduler() {
    console.log(`⏳ Trade Sync Scheduler started (Bulk Mode). Interval: ${SYNC_INTERVAL_MS / 1000}s`);
    runTradeSync();
    setInterval(runTradeSync, SYNC_INTERVAL_MS);
}

let isSyncing = false;

async function runTradeSync() {
    if (isSyncing) {
        console.log(" [Trade Sync] Previous cycle still running. Skipping this tick.");
        return;
    }
    isSyncing = true;
    try {
        console.log(" [Trade Apps] Starting Bulk Sync Cycle...");

        // 1. Fetch Active Challenges
        const { data: challenges, error } = await supabase
            .from('challenges')
            .select('id, user_id, login, created_at')
            .eq('status', 'active');

        if (error || !challenges || challenges.length === 0) return;

        // 2. Process in Batches (e.g. 25 accounts per HTTP request - Reduced for stability)
        const BATCH_SIZE = 25;
        for (let i = 0; i < challenges.length; i += BATCH_SIZE) {
            const batch = challenges.slice(i, i + BATCH_SIZE);
            await processBatch(batch);

            // Rate limit: Sleep 200ms between batches
            if (i + BATCH_SIZE < challenges.length) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }

        console.log(`[Trade Sync] Cycle Complete. Synced ${challenges.length} accounts.`);

    } catch (e) {
        console.error(" [Trade Sync] Cycle Error:", e);
    } finally {
        isSyncing = false;
    }
}

async function processBatch(challenges: any[], attempt = 1) {
    const MAX_RETRIES = 3;
    try {
        const logins = challenges.map(c => Number(c.login));
        const challengeMap = new Map(challenges.map(c => [Number(c.login), c]));

        // Bridge V2 (FastAPI) only supports single account fetch: /fetch-trades
        // We must parallelize requests instead of using /fetch-trades-bulk (which doesn't exist)

        const trades: any[] = [];

        // Parallelize with concurrency limit (e.g. 5 concurrent requests)
        // Parallelize with concurrency limit (Reduced to 1 for stability)
        const CONCURRENCY = 1;
        for (let i = 0; i < logins.length; i += CONCURRENCY) {
            const chunk = logins.slice(i, i + CONCURRENCY);
            const chunkPromises = chunk.map(login => fetchMT5Trades(login).catch((err: any) => {
                console.error(` Failed to fetch trades for ${login}:`, err.message);
                return [];
            }));

            const chunkResults = await Promise.all(chunkPromises);
            chunkResults.forEach(res => {
                if (Array.isArray(res)) trades.push(...res);
            });

            // Polite Delay to prevent ECONNRESET
            if (i + CONCURRENCY < logins.length) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        if (trades.length === 0) return;

        // Format trades for DB
        const formattedTrades = trades.map((t: any) => {
            const challenge = challengeMap.get(t.login);
            if (!challenge) return null;

            // GHOST TRADE PROTECTION: Ignore trades older than challenge creation
            const challengeStartTime = new Date(challenge.created_at).getTime();
            const tradeTime = (t.close_time || t.time) * 1000; // Prefer close time for historical checks

            // Allow 60s buffer for clock skew
            if (tradeTime < (challengeStartTime - 60000)) {
                // console.log(`👻 Ignored Ghost Trade ${t.ticket} (Time: ${new Date(tradeTime).toISOString()} < Created: ${challenge.created_at})`);
                return null;
            }

            return {
                ticket: t.ticket,
                challenge_id: challenge.id,
                user_id: challenge.user_id,
                symbol: t.symbol,
                type: t.type === 0 ? 'buy' : t.type === 1 ? 'sell' : 'balance',
                lots: t.volume / 100, // Normalize raw MT5 integer volume (e.g. 4000 -> 40)
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
            // Deduplicate trades locally to prevent "ON CONFLICT DO UPDATE command cannot affect row a second time"
            // This happens if the bridge returns duplicates or if we process the same login multiple times in a batch
            const uniqueTradesMap = new Map();
            formattedTrades.forEach((t: any) => {
                const key = `${t.challenge_id}-${t.ticket}`;
                uniqueTradesMap.set(key, t);
            });
            const uniqueTrades = Array.from(uniqueTradesMap.values());

            // Upsert to Supabase
            const { error } = await supabase.from('trades').upsert(uniqueTrades, { onConflict: 'challenge_id, ticket' });

            if (error) {
                console.error(" Bulk Upsert Failed:", error);
            } else {
                const uniqueLogins = new Set(trades.map((t: any) => t.login));
                for (const login of Array.from(uniqueLogins)) {
                    // Filter RAW TRADES for this login
                    const rawAccountTrades = trades.filter((t: any) => t.login == login);

                    if (rawAccountTrades.length > 0) {
                        const eventPayload = {
                            login: Number(login),
                            trades: rawAccountTrades, // RAW TRADES
                            timestamp: Date.now()
                        };
                        await getRedis().publish('events:trade_update', JSON.stringify(eventPayload));
                    }
                }
            }
        }

    } catch (e: any) {
        if (attempt <= MAX_RETRIES) {
            console.warn(`⚠️ Batch failed (Attempt ${attempt}/${MAX_RETRIES}). Retrying in 1s...`, e.message);
            await new Promise(resolve => setTimeout(resolve, 1000));
            return processBatch(challenges, attempt + 1);
        } else {
            console.error(` Error processing batch after ${MAX_RETRIES} attempts:`, e);
        }
    }
}
