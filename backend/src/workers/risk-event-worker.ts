import { Worker, Job } from 'bullmq';
import { getRedis } from '../lib/redis';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { CoreRiskEngine } from '../engine/risk-engine-core';
import { AdvancedRiskEngine } from '../engine/risk-engine-advanced';
import { EmailService } from '../services/email-service';
import { disableMT5Account } from '../lib/mt5-bridge';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

const coreEngine = new CoreRiskEngine(supabase);
const advancedEngine = new AdvancedRiskEngine(supabase);
const DEBUG = process.env.DEBUG === 'true'; // STRICT: Silence risk worker logs in dev

// Main Worker Function
export async function startRiskEventWorker() {
    if (DEBUG) console.log('⚡ Risk Event Worker Started (Queue: risk-queue)...');

    const worker = new Worker('risk-queue', async (job: Job) => {
        // Parallel Processing (Concurrency: 50)!!
        try {
            await processTradeEvent(job.data);
        } catch (e) {
            console.error(`❌ Risk Job ${job.id} failed for account ${job.data.login}:`, e);
            throw e; // Retry logic handled by queue
        }
    }, {
        connection: getRedis() as any, // Reuse singleton
        concurrency: 50, // SCALABILITY FIX: Process 50 events in parallel
        limiter: {
            max: 1000,
            duration: 1000 // Rate limit: max 1000 jobs per second
        },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 500 }
    });

    worker.on('failed', (job, err) => {
        console.error(`❌ Risk Job ${job?.id} failed: ${err.message}`);
    });

    if (DEBUG) console.log('✅ Risk Worker Initialized with concurrency: 50');
    return worker;
}

async function processTradeEvent(data: { login: number, trades: any[], timestamp: number }) {
    const { login, trades } = data;

    let meaningfulTrades: any[] = [];

    // 1. Fetch Challenge
    const { data: challenge } = await supabase
        .from('challenges')
        .select('id, user_id, initial_balance, start_of_day_equity, status, created_at, group')
        .eq('login', login)
        .single();

    if (!challenge || challenge.status !== 'active') {
        // if (DEBUG) console.warn(`⚠️ [RiskEvent] Early Exit for ${login}: Challenge found? ${!!challenge}, Status: ${challenge?.status}`);
        return;
    }

    // 2. Filter Trades for behavioral checks (Ghost Trade Protection)
    const validIncomingTrades = trades.filter((t: any) => t.volume > 0 && ['0', '1', 'buy', 'sell'].includes(String(t.type).toLowerCase()));

    // START FIX: Systematic Data Correction (Auto-detect Type based on PnL vs Price)
    validIncomingTrades.forEach((t: any) => {
        // 1. Get raw type
        const rawType = (String(t.type) === '0' || String(t.type).toLowerCase() === 'buy') ? 'buy' : 'sell';

        // 2. Calculate Profit & Price Delta
        const profit = Number(t.profit);
        const openPrice = Number(t.price);
        const closePrice = t.close_price ? Number(t.close_price) : Number(t.current_price || t.price);
        const priceDelta = closePrice - openPrice;

        // 3. Inference Logic (Only if profit is significant > $1.00)
        if (Math.abs(profit) > 1.0) {
            if (profit > 0) {
                // Profitable: Price UP = Buy, Price DOWN = Sell
                if (priceDelta > 0) t.type = 'buy';
                else if (priceDelta < 0) t.type = 'sell';
            } else {
                // Loss: Price UP = Sell, Price DOWN = Buy
                if (priceDelta > 0) t.type = 'sell';
                else if (priceDelta < 0) t.type = 'buy';
            }
        }
        // Else keep original type
    });
    // END FIX

    const challengeStartTime = new Date(challenge.created_at).getTime() / 1000;
    // Optimization: Only process trades that opened or closed in the last 24 hours to reduce load
    const oneDayAgo = (Date.now() / 1000) - 86400;
    meaningfulTrades = validIncomingTrades.filter((t: any) => t.time >= oneDayAgo);

    // console.log(`[RiskEvent] Login ${login}: ${meaningfulTrades.length} meaningful trades / ${trades.length} total.`);

    // 3. Recalculate Equity (In-Memory if possible, or simple query)
    // 3. Recalculate Equity (In-Memory if possible, or simple query)
    // Query DB for verified calculation, but strictly filter out 0-lot trades (deposits)
    const { data: dbTrades } = await supabase.from('trades')
        .select('profit_loss, commission, swap, close_time')
        .eq('challenge_id', challenge.id)
        .gt('lots', 0); // Strict filter: Real trades must have lots > 0

    // ... (Summing Logic) ...
    let closedProfit = 0;
    let floatingProfit = 0;

    if (dbTrades) {
        for (const t of dbTrades) {
            // Fix: Commission is reported per-side (or half), so we deduct it twice to match Net P&L (User Expectation: 1.98 vs 2.58)
            const netProfit = Number(t.profit_loss) + (Number(t.commission || 0) * 2) + Number(t.swap || 0);
            if (t.close_time) closedProfit += netProfit;
            else floatingProfit += netProfit;
        }
    }

    const initialBalance = Number(challenge.initial_balance);
    const newBalance = initialBalance + closedProfit;
    const newEquity = newBalance + floatingProfit;

    // 4. Check Risk Rules (Immediate)
    // Fetch Rules (Cache this in Redis later!)
    const { data: riskGroups } = await supabase.from('mt5_risk_groups').select('*');
    // Default rule since we don't have 'group' column in challenges table
    const rule = { max_drawdown_percent: 10, daily_drawdown_percent: 5 };
    // Optimization: If we had group, we would do: riskGroups?.find(g => g.group_name === challenge.group)

    const totalLimit = initialBalance * (1 - (rule.max_drawdown_percent / 100));
    // Fallback to initial_balance since DB column is missing
    const startOfDayEquity = Number((challenge as any).start_of_day_equity || initialBalance);
    const dailyLimit = startOfDayEquity * (1 - (rule.daily_drawdown_percent / 100));
    const effectiveLimit = Math.max(totalLimit, dailyLimit);

    // 5. Update Challenge Status & Breach Detection
    const updateData: any = {
        current_balance: newBalance,
        current_equity: newEquity
    };

    if (newEquity < effectiveLimit && challenge.status !== 'failed') {
        console.log(`🛑 BREACH DETECTED (Event): Account ${login}. Equity: ${newEquity} < Limit: ${effectiveLimit}`);
        updateData.status = 'failed';

        // Log Violation
        await supabase.from('risk_violations').insert({
            challenge_id: challenge.id,
            user_id: challenge.user_id,
            violation_type: 'max_loss_breach',
            details: { equity: newEquity, balance: newBalance, timestamp: new Date() }
        });

        // 🚨 CRITICAL: Immediately Disable Account on Bridge
        try {
            if (DEBUG) console.log(`🔌 [RiskEvent] Disabling account ${login} on MT5 Bridge...`);
            await disableMT5Account(login);
        } catch (bridgeErr) {
            console.error(`❌ [RiskEvent] Failed to disable account ${login} on Bridge:`, bridgeErr);
        }

        // Send Breach Email
        try {
            const { data: { user } } = await supabase.auth.admin.getUserById(challenge.user_id);
            if (user && user.email) {
                if (DEBUG) console.log(`📧 Sending breach email to ${user.email} for account ${login}`);
                await EmailService.sendBreachNotification(
                    user.email,
                    user.user_metadata?.full_name || 'Trader',
                    String(login),
                    'Max Loss Limit Exceeded',
                    `Equity (${newEquity}) dropped below Limit (${effectiveLimit})`
                );
            }
        } catch (emailError) {
            console.error('🔥 Failed to send breach email:', emailError);
        }
    }

    // 6. Behavioral Risk Checks (Martingale, Hedging, Tick Scalping)
    try {
        // Fetch Rules Config based on Group
        let rulesConfig;

        if (challenge.group) {
            const { data: groupConfig } = await supabase
                .from('risk_rules_config')
                .select('*')
                .eq('mt5_group_name', challenge.group)
                .maybeSingle(); // Use maybeSingle to avoid error if not found

            rulesConfig = groupConfig;
        }

        // Fallback if no specific group config found
        if (!rulesConfig) {
            const { data: defaultConfig } = await supabase
                .from('risk_rules_config')
                .select('*')
                .limit(1)
                .maybeSingle();
            rulesConfig = defaultConfig;
        }

        const rules = {
            allow_weekend_trading: rulesConfig?.allow_weekend_trading ?? true,
            allow_news_trading: rulesConfig?.allow_news_trading ?? true,
            allow_ea_trading: rulesConfig?.allow_ea_trading ?? true,
            min_trade_duration_seconds: rulesConfig?.min_trade_duration_seconds ?? 0,
            max_single_win_percent: rulesConfig?.max_single_win_percent ?? 50,
            // New Flags (Default to TRUE/Allowed if missing to avoid mass breaches)
            allow_hedging: rulesConfig?.allow_hedging ?? true,
            allow_martingale: rulesConfig?.allow_martingale ?? true
        };

        // Get context trades (today's and open)
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString();

        // Fetch Today's Trades (for daily stats)
        const { data: todaysTrades } = await supabase.from('trades')
            .select('*')
            .eq('challenge_id', challenge.id)
            .gte('open_time', today);

        // Fetch ALL Closed Trades (As requested: Full history for Martingale)
        // Optimization: Select only necessary columns to reduce payload
        const { data: recentHistory } = await supabase.from('trades')
            .select('ticket, close_time, profit_loss, lots, type, symbol, open_time')
            .eq('challenge_id', challenge.id)
            .not('close_time', 'is', null)
            .order('close_time', { ascending: false });

        // Merge for holistic analysis
        const analysisHistory = [
            ...(todaysTrades || []),
            ...(recentHistory || [])
        ].filter((t, index, self) =>
            index === self.findIndex((x) => x.ticket === t.ticket) // Deduplicate
        );

        // Fetch "Concurrent" trades for Hedging check
        // Must include currently OPEN trades AND recently CLOSED trades (to catch historical overlaps during sync)
        const { data: concurrentTrades } = await supabase.from('trades')
            .select('*')
            .eq('challenge_id', challenge.id)
            .or(`close_time.is.null,close_time.gte.${yesterday}`);


        // Fix: Map concurrentTrades to Ensure Date objects (Supabase returns strings)
        // AND prioritize incoming raw types if available (to fix DB mismatches)
        const incomingTypeMap = new Map<string, string>();
        trades.forEach((t: any) => {
            const normalizedType = (String(t.type) === '0' || String(t.type).toLowerCase() === 'buy') ? 'buy' : 'sell';
            incomingTypeMap.set(String(t.ticket), normalizedType);
        });

        const concurrentTradesForEngine = (concurrentTrades || []).map((t: any) => {
            const ticket = String(t.ticket);
            // Use incoming raw type if available, otherwise fallback to DB type
            const finalType = incomingTypeMap.get(ticket) || ((String(t.type) === '0' || String(t.type).toLowerCase() === 'buy') ? 'buy' : 'sell');

            return {
                ...t,
                ticket_number: ticket,
                type: finalType,
                open_time: new Date(t.open_time),
                close_time: t.close_time ? new Date(t.close_time) : undefined
            };
        });

        if (concurrentTradesForEngine.length > 0) {
            // const sample = concurrentTradesForEngine[0];
            // console.log(`🔎 [DEBUG-TYPE] open_time type: ${typeof sample.open_time}, val: ${sample.open_time}`);
            // console.log(`🔎 [DEBUG-TYPE] DB Trade #0 ticket: ${sample.ticket_number}, RAW type: ${concurrentTrades[0].type}, Mapped type: ${sample.type}`);
        }

        // Analyze each incoming trade for behavioral patterns
        // FIX: Ensure meaningfulTrades is defined/accessible
        if (meaningfulTrades && meaningfulTrades.length > 0) {
            // console.log(`🔎 [DEBUG-TYPE] Incoming Trade #0 ticket: ${meaningfulTrades[0].ticket}, RAW type: ${meaningfulTrades[0].type}`);
            for (const t of meaningfulTrades) {
                // Debug: Check if close_time exists for closed trades
                if (t.close_time) {
                    // console.log(`🕵️ Risk Check: Ticket ${t.ticket}, Close Time: ${t.close_time}`);
                    // console.log(`   Rules: Min Duration ${rules.min_trade_duration_seconds}s`);
                }

                // Map to internal Trade type for engine
                const tradeForEngine = {
                    challenge_id: challenge.id,
                    user_id: challenge.user_id,
                    ticket_number: String(t.ticket),
                    symbol: t.symbol,
                    type: (String(t.type) === '0' || String(t.type).toLowerCase() === 'buy') ? 'buy' : 'sell' as 'buy' | 'sell',
                    lots: t.volume / 10000,
                    open_price: t.price || 0,
                    profit_loss: t.profit || 0,
                    open_time: new Date(t.time * 1000),
                    close_time: t.close_time ? new Date(t.close_time * 1000) : undefined // Ensure this is definitely a Date if closed
                };

                const behavioralViolations = await advancedEngine.checkBehavioralRisk(
                    tradeForEngine as any,
                    rules,
                    (analysisHistory || []) as any,
                    concurrentTradesForEngine as any // Pass correctly formatted trades
                );

                if (behavioralViolations.length > 0) {
                    for (const v of behavioralViolations) {
                        await advancedEngine.logFlag(challenge.id, challenge.user_id, v);
                    }
                }
            }
        }
    } catch (err) {
        console.error('Failed advanced risk checks:', err);
    }

    // 7. Commit Updates
    await supabase.from('challenges').update(updateData).eq('id', challenge.id);

    // console.log(`✅ Processed event for ${login} in ${Date.now() - startTime}ms`);
}
