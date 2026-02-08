import { getRedisSub } from '../lib/redis';
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

// Main Worker Function
export async function startRiskEventWorker() {
    console.log('⚡ Risk Event Worker Started (Listening for Redis events)...');

    // Use the dedicated subscriber singleton
    const subRedis = getRedisSub();

    await subRedis.subscribe('events:trade_update', (err) => {
        if (err) console.error('Failed to subscribe to trade updates:', err);
    });

    subRedis.on('message', async (channel, message) => {
        if (channel === 'events:trade_update') {
            try {
                const eventData = JSON.parse(message);
                await processTradeEvent(eventData);
            } catch (e) {
                console.error('Error processing event:', e);
            }
        }
    });
}

async function processTradeEvent(data: { login: number, trades: any[], timestamp: number }) {
    const { login, trades } = data;
    // const startTime = Date.now();
    // console.log(`🔄 Processing event for login ${login} (${trades.length} trades)`);

    // 1. Fetch Challenge
    const { data: challenge } = await supabase
        .from('challenges')
        .select('id, user_id, initial_balance, start_of_day_equity, status, created_at, group')
        .eq('login', login)
        .single();

    if (!challenge || challenge.status !== 'active') return;

    // 2. Format & Upsert Trades (Mirroring logic from old webhook)
    const validIncomingTrades = trades.filter((t: any) => t.volume > 0 && ['0', '1', 'buy', 'sell'].includes(String(t.type).toLowerCase()));

    // FIX: Filter out Ghost Trades (history from previous users of this Login ID)
    // Only accept trades that happened AFTER the challenge was created (minus 30s buffer for clock skew)
    const challengeStartTime = new Date(challenge.created_at).getTime() / 1000;
    const meaningfulTrades = validIncomingTrades.filter((t: any) => t.time >= (challengeStartTime - 30));

    if (meaningfulTrades.length > 0) {
        const formattedTrades = meaningfulTrades.map((t: any) => ({
            ticket: t.ticket,
            challenge_id: challenge.id,
            user_id: challenge.user_id,
            symbol: t.symbol,
            type: t.type === 0 ? 'buy' : 'sell',
            lots: t.volume / 10000,
            open_price: t.price,
            profit_loss: t.profit,
            commission: t.commission,
            swap: t.swap,
            open_time: new Date(t.time * 1000).toISOString(),
            close_time: t.close_time ? new Date(t.close_time * 1000).toISOString() : null,
        }));

        // Deduplicate to prevent "ON CONFLICT DO UPDATE" errors
        const uniqueTrades = Array.from(
            formattedTrades.reduce((map: Map<string, any>, trade: any) => {
                const key = `${trade.challenge_id}-${trade.ticket}`;
                map.set(key, trade);
                return map;
            }, new Map()).values()
        );

        await supabase.from('trades').upsert(uniqueTrades, { onConflict: 'challenge_id, ticket' });
    }

    // 3. Recalculate Equity (In-Memory if possible, or simple query)
    // Query DB for verified calculation, but strictly filter out 0-lot trades (deposits)
    const { data: dbTrades } = await supabase.from('trades')
        .select('profit_loss, close_time')
        .eq('challenge_id', challenge.id)
        .gt('lots', 0); // Strict filter: Real trades must have lots > 0

    // ... (Summing Logic) ...
    let closedProfit = 0;
    let floatingProfit = 0;

    if (dbTrades) {
        for (const t of dbTrades) {
            if (t.close_time) closedProfit += Number(t.profit_loss);
            else floatingProfit += Number(t.profit_loss);
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
            console.log(`🔌 [RiskEvent] Disabling account ${login} on MT5 Bridge...`);
            await disableMT5Account(login);
        } catch (bridgeErr) {
            console.error(`❌ [RiskEvent] Failed to disable account ${login} on Bridge:`, bridgeErr);
        }

        // Send Breach Email
        try {
            const { data: { user } } = await supabase.auth.admin.getUserById(challenge.user_id);
            if (user && user.email) {
                console.log(`📧 Sending breach email to ${user.email} for account ${login}`);
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
        const { data: todaysTrades } = await supabase.from('trades')
            .select('*')
            .eq('challenge_id', challenge.id)
            .gte('open_time', today);

        const { data: openTrades } = await supabase.from('trades')
            .select('*')
            .eq('challenge_id', challenge.id)
            .is('close_time', null);

        // Analyze each incoming trade for behavioral patterns
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
                type: (t.type === 0 || t.type === 'buy') ? 'buy' : 'sell' as 'buy' | 'sell',
                lots: t.volume / 10000,
                open_price: t.price || 0,
                profit_loss: t.profit || 0,
                open_time: new Date(t.time * 1000),
                close_time: t.close_time ? new Date(t.close_time * 1000) : undefined // Ensure this is definitely a Date if closed
            };

            const behavioralViolations = await advancedEngine.checkBehavioralRisk(
                tradeForEngine as any,
                rules,
                (todaysTrades || []) as any,
                (openTrades || []) as any
            );

            if (behavioralViolations.length > 0) {
                // console.log(`🚨 VIOLATIONS FOUND for Ticket ${t.ticket}:`, behavioralViolations);
                for (const v of behavioralViolations) {
                    // console.log(`🚩 Behavioral Flag: Account ${login}, Type: ${v.violation_type}, Ticket: ${v.trade_ticket}`);
                    await advancedEngine.logFlag(challenge.id, challenge.user_id, v);
                }
            } else if (t.close_time) {
                // Debug why no violation if closed
                const duration = (tradeForEngine.close_time!.getTime() - tradeForEngine.open_time.getTime()) / 1000;
                if (duration < rules.min_trade_duration_seconds) {
                    console.log(`⚠️ MISSED SCALPING? Duration ${duration}s < Min ${rules.min_trade_duration_seconds}s`);
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
