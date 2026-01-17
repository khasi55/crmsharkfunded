import { redis } from '../lib/redis';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { CoreRiskEngine } from '../engine/risk-engine-core';
import { AdvancedRiskEngine } from '../engine/risk-engine-advanced';
import { EmailService } from '../services/email-service';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

const coreEngine = new CoreRiskEngine(supabase);
const advancedEngine = new AdvancedRiskEngine(supabase);

// Main Worker Function
export async function startRiskEventWorker() {
    console.log('⚡ Risk Event Worker Started (Listening for Redis events)...');

    // Create a dedicated subscriber client (Redis requires dedicated connection for sub)
    const subRedis = redis.duplicate();

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
        .select('id, user_id, initial_balance, start_of_day_equity, status, created_at')
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

        await supabase.from('trades').upsert(formattedTrades, { onConflict: 'challenge_id, ticket' });
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

    // 5. Update Challenge Status
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
            } else {
                console.warn(`⚠️ Could not find user email for breach notification (User ID: ${challenge.user_id})`);
            }
        } catch (emailError) {
            console.error('🔥 Failed to send breach email:', emailError);
        }

        // Disable MT5 Account (Async call to bridge - don't await blocking)
        // fetch(`${process.env.BRIDGE_URL}/disable-account`, ... )
    }

    await supabase.from('challenges').update(updateData).eq('id', challenge.id);
    // console.log(`✅ Processed event for ${login} in ${Date.now() - startTime}ms`);
}
