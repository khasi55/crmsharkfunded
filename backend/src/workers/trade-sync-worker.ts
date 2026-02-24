import { Worker, Job } from 'bullmq';
import { getRedis } from '../lib/redis';
import { fetchMT5Trades } from '../lib/mt5-bridge';
import { riskQueue } from '../lib/queue';
import { supabase, supabaseAdmin } from '../lib/supabase';

const DEBUG = process.env.DEBUG === 'true'; // Strict: Only log if explicitly asked

export async function startTradeSyncWorker() {
    if (DEBUG) console.log('👷 Trade Sync Worker Started (Queue: sync-queue)...');

    const worker = new Worker('sync-queue', async (job: Job) => {
        const { challengeId, userId, login, createdAt } = job.data;
        const startTime = Date.now();

        try {
            // 1. Fetch Trades from Bridge (Active + History in one call)
            // Use a specific timeout for the sync worker (faster than Cloudflare's 100s)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

            const oneWeekAgo = Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60);
            const { fetchMT5History } = await import('../lib/mt5-bridge');
            const allBridgeTrades = await fetchMT5History(login, oneWeekAgo, controller.signal);

            clearTimeout(timeoutId);

            if (allBridgeTrades.length === 0) return { success: true, count: 0 };

            // 2. Format & Filter (Ghost Trade Protection)
            const challengeStartTime = new Date(createdAt).getTime();

            // 3. Fetch Existing Trades to Prevent Overwriting Fixes & Calculate Delta
            const { data: existingTrades } = await supabaseAdmin
                .from('trades')
                .select('ticket, type, close_time, profit_loss, commission, swap')
                .eq('challenge_id', challengeId);

            const existingTradesMap = new Map<string, any>();
            existingTrades?.forEach((t: any) => existingTradesMap.set(String(t.ticket), t));

            const formattedTrades = allBridgeTrades.map((t: any) => {
                const tradeTime = (t.close_time || t.time) * 1000;

                // Allow 60s buffer for clock skew
                if (tradeTime < (challengeStartTime - 60000)) return null;

                // Check if we have a manual fix in DB
                const existingTrade = existingTradesMap.get(String(t.ticket));
                const existingType = existingTrade?.type;

                // Determine Input Type (from Bridge)
                let inputType = (t.type === 0 || String(t.type).toLowerCase() === 'buy') ? 'buy' : 'sell';

                // LOCKDOWN LOGIC:
                // 1. Hardcoded Failsafe for Known Ticket
                if (String(t.ticket) === '8120684') {
                    inputType = 'buy';
                }

                // 2. Dynamic Protection: If DB has 'buy' and Bridge has 'sell', KEEP 'buy'
                else if (existingType === 'buy' && inputType === 'sell') {
                    inputType = 'buy';
                }

                return {
                    ticket: t.ticket,
                    challenge_id: challengeId,
                    user_id: userId,
                    symbol: t.symbol,
                    // SYSTEMATIC FIX: Auto-correct trade type based on Price Action vs Profit (New Logic)
                    type: (() => {
                        let tType = inputType;
                        const profit = Number(t.profit);
                        const openPrice = Number(t.price);
                        const closePrice = t.close_price ? Number(t.close_price) : Number(t.current_price || t.price);

                        // Skip if prices or profit are invalid/zero/noise
                        if (openPrice > 0 && closePrice > 0 && Math.abs(profit) > 0.0001) {
                            const priceDelta = closePrice - openPrice;

                            if (profit > 0) {
                                // Profitable Trade
                                if (priceDelta > 0) tType = 'buy';      // Up + Profit = Buy
                                else if (priceDelta < 0) tType = 'sell'; // Down + Profit = Sell
                            } else {
                                // Losing Trade
                                if (priceDelta > 0) tType = 'sell';      // Up + Loss = Sell
                                else if (priceDelta < 0) tType = 'buy';  // Down + Loss = Buy
                            }
                        }

                        return tType;
                    })(),
                    lots: t.volume / 100,
                    open_price: t.price,
                    close_price: t.close_price || null,
                    profit_loss: t.profit,
                    open_time: new Date(t.time * 1000).toISOString(),
                    close_time: t.close_time ? new Date(t.close_time * 1000).toISOString() : null,
                    commission: t.commission,
                    swap: t.swap,
                };
            }).filter((t: any) => t !== null);

            if (formattedTrades.length === 0) return { success: true, count: 0 };

            // 4. Deduplicate
            const uniqueTrades = Array.from(
                formattedTrades.reduce((map: Map<string, any>, trade: any) => {
                    const key = `${trade.challenge_id}-${trade.ticket}`;
                    map.set(key, trade);
                    return map;
                }, new Map()).values()
            );

            // 4.5 DELTA VERIFICATION (Optimization to reduce DB load)
            let hasOpenTrades = false;
            const tradesToUpsert = uniqueTrades.filter((trade: any) => {
                if (!trade.close_time) {
                    hasOpenTrades = true;
                    return true; // Always upsert open trades (floating profit changes)
                }

                const existing = existingTradesMap.get(String(trade.ticket));
                if (!existing) return true; // New trade

                if (!existing.close_time && trade.close_time) return true; // Newly closed trade

                // If it was already closed, check if core metrics changed (retroactive broker adjustment)
                // THRESHOLD INCREASE: Don't write to DB/Trigger Risk unless moving by at least $1.00 
                // This prevents micro-fluctuations in swap/profit from causing thousands of DB queries/minute.
                const isModified =
                    Math.abs(Number(existing.profit_loss || 0) - Number(trade.profit_loss || 0)) > 1.00 ||
                    Math.abs(Number(existing.commission || 0) - Number(trade.commission || 0)) > 1.00 ||
                    Math.abs(Number(existing.swap || 0) - Number(trade.swap || 0)) > 1.00;

                return isModified;
            });

            if (tradesToUpsert.length === 0 && !hasOpenTrades) {
                // No changes, no open trades = skip heavy DB writes and risk trigger
                return { success: true, count: 0, skipped: true };
            }

            // 5. Upsert to DB ONLY the delta
            const { error } = await supabaseAdmin
                .from('trades')
                .upsert(tradesToUpsert, { onConflict: 'challenge_id, ticket' });

            if (error) throw error;

            // 6. Trigger Risk Engine
            const eventPayload = {
                login: Number(login),
                trades: allBridgeTrades, // Raw trades for advanced engine
                timestamp: Date.now()
            };

            await riskQueue.add('process-risk', eventPayload);

            const duration = (Date.now() - startTime) / 1000;
            if (DEBUG && (tradesToUpsert.length > 0 || duration > 15)) {
                console.log(`✅ [Sync] ${login}: +${tradesToUpsert.length} trades (${duration.toFixed(1)}s)`);
            }

            return { success: true, count: tradesToUpsert.length };

        } catch (e: any) {
            if (e.name === 'AbortError') {
                if (DEBUG) console.warn(`⏳ [Sync Timeout] Account ${login} took > 60s. Skipping for now.`);
            } else {
                console.error(`❌ [Sync Worker] Failed for ${login}:`, e.message);
            }
            // Do not throw for timeouts, just finish the job so we don't spam retries on dead accounts
            if (e.name === 'AbortError') return { success: false, error: 'timeout' };
            throw e; // Retry for real errors
        }
    }, {
        connection: getRedis() as any,
        concurrency: 5, // Toned down from 20 to 5 to avoid PostgREST connection starvation and 522s
        limiter: {
            max: 500,
            duration: 1000
        }
    });

    worker.on('failed', (job, err) => {
        // console.error(`❌ Sync Job ${job?.id} failed: ${err.message}`);
    });

    if (DEBUG) console.log('✅ Trade Sync Worker Initialized with concurrency: 5');
    return worker;
}
