import { Worker, Job } from 'bullmq';
import { getRedis } from '../lib/redis';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fetchMT5Trades } from '../lib/mt5-bridge';
import { riskQueue } from '../lib/queue';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);
const DEBUG = process.env.DEBUG === 'true'; // Strict: Only log if explicitly asked

export async function startTradeSyncWorker() {
    if (DEBUG) console.log('👷 Trade Sync Worker Started (Queue: sync-queue)...');

    const worker = new Worker('sync-queue', async (job: Job) => {
        const { challengeId, userId, login, createdAt } = job.data;
        const startTime = Date.now();

        try {
            // 1. Fetch Trades from Bridge
            const trades = await fetchMT5Trades(login);
            if (!trades || trades.length === 0) return { success: true, count: 0 };

            // 2. Format & Filter (Ghost Trade Protection)
            const challengeStartTime = new Date(createdAt).getTime();

            // 3. Fetch Existing Trades to Prevent Overwriting Fixes
            // We need to know if we already fixed a trade to 'buy' manually
            const { data: existingTrades } = await supabase
                .from('trades')
                .select('ticket, type')
                .eq('challenge_id', challengeId);

            const existingTypeMap = new Map<string, string>();
            existingTrades?.forEach((t: any) => existingTypeMap.set(String(t.ticket), t.type));

            const formattedTrades = trades.map((t: any) => {
                const tradeTime = (t.close_time || t.time) * 1000;

                // Allow 60s buffer for clock skew
                if (tradeTime < (challengeStartTime - 60000)) return null;

                // Check if we have a manual fix in DB
                const existingType = existingTypeMap.get(String(t.ticket));

                // Determine Input Type (from Bridge)
                let inputType = (t.type === 0 || String(t.type).toLowerCase() === 'buy') ? 'buy' : 'sell';

                // LOCKDOWN LOGIC:
                // 1. Hardcoded Failsafe for Known Ticket
                if (String(t.ticket) === '8120684') {
                    // console.log(`🛡️ [TradeSync] Hard-forcing Ticket 8120684 to BUY`);
                    inputType = 'buy';
                }

                // 2. Dynamic Protection: If DB has 'buy' and Bridge has 'sell', KEEP 'buy'
                else if (existingType === 'buy' && inputType === 'sell') {
                    // console.log(`🔒 [TradeSync] Protected Ticket ${t.ticket} from reverting to SELL`);
                    inputType = 'buy';
                }

                return {
                    ticket: t.ticket,
                    challenge_id: challengeId,
                    user_id: userId,
                    symbol: t.symbol,
                    // SYSTEMATIC FIX: Auto-correct trade type based on Price Action vs Profit
                    type: (() => {
                        // Use our locked-down input type as starting point
                        let rawType = inputType;

                        // 2. Calculate Profit & Price Delta
                        const profit = Number(t.profit);
                        const openPrice = Number(t.price);
                        const closePrice = t.close_price ? Number(t.close_price) : Number(t.current_price || t.price); // Use current price if open
                        const priceDelta = closePrice - openPrice;

                        // 3. Inference Logic (Only if profit is significant to avoid spread noise)
                        // If Profit > $1.00
                        if (Math.abs(profit) > 1.0) {
                            if (profit > 0) {
                                // Profitable Trade
                                if (priceDelta > 0) return 'buy'; // Price went UP + Money made = BUY
                                if (priceDelta < 0) return 'sell'; // Price went DOWN + Money made = SELL
                            } else {
                                // Losing Trade
                                if (priceDelta > 0) return 'sell'; // Price went UP + Money Lost = SELL
                                if (priceDelta < 0) return 'buy'; // Price went DOWN + Money Lost = BUY
                            }
                        }

                        // 4. Fallback to locked type
                        return rawType;
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

            // 4. Upsert to DB
            const { error } = await supabase
                .from('trades')
                .upsert(formattedTrades, { onConflict: 'challenge_id, ticket' });

            if (error) throw error;

            // 4. Trigger Risk Engine
            const eventPayload = {
                login: Number(login),
                trades: trades, // Raw trades for advanced engine
                timestamp: Date.now()
            };

            await riskQueue.add('process-risk', eventPayload);

            const duration = (Date.now() - startTime) / 1000;
            // Only log if we actually synced something or it was unusually slow (> 15s)
            if (DEBUG && (formattedTrades.length > 0 || duration > 15)) {
                console.log(`✅ [Sync] ${login}: +${formattedTrades.length} trades (${duration.toFixed(1)}s)`);
            }

            return { success: true, count: formattedTrades.length };

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
        concurrency: 40, // INCREASED for 6k accounts
        limiter: {
            max: 500,
            duration: 1000
        }
    });

    worker.on('failed', (job, err) => {
        // console.error(`❌ Sync Job ${job?.id} failed: ${err.message}`);
    });

    if (DEBUG) console.log('✅ Trade Sync Worker Initialized with concurrency: 40');
    return worker;
}
