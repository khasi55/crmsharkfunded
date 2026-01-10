import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { supabaseAdmin } from '@/lib/supabase';
import { RiskEngine } from '@/lib/risk-engine';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { accountId, ticket, symbol, type, lots, price, profit, equity, balance, open_time, close_time, user_id, challenge_id } = body;

        // --- STEP 1: SPEED LAYER (Redis) ---
        // Update dashboard stats immediately
        // Multi-command pipeline for atomic update
        const pipeline = redis.pipeline();
        pipeline.hset(`user:${accountId}:stats`, {
            equity: equity,
            balance: balance,
            last_update: Date.now()
        });
        // Also cache the latest trade for "Recent Trades" widget
        pipeline.lpush(`user:${accountId}:trades`, JSON.stringify(body));
        pipeline.ltrim(`user:${accountId}:trades`, 0, 49); // Keep last 50 trades
        await pipeline.exec();


        // --- STEP 2: STORAGE LAYER (Supabase) ---
        // Async insert effectively, or await if we need ID
        const { error: dbError } = await supabaseAdmin
            .from('trades')
            .insert({
                account_id: accountId,
                ticket,
                symbol,
                type,
                lots,
                price,
                profit,
                equity_snapshot: equity,
                balance_snapshot: balance
            });

        if (dbError) {
            console.error('Supabase Insert Error:', dbError);
            // We continue even if DB fails, because we need to check risk? 
            // Or maybe we should retry? For MVP, we log.
        }

        // --- STEP 3: RISK LAYER (Logic) ---
        const riskEngine = new RiskEngine(supabaseAdmin);
        const trade = {
            id: ticket,
            challenge_id: challenge_id || accountId,
            user_id: user_id || 'unknown',
            ticket_number: ticket,
            symbol,
            type: type as 'buy' | 'sell',
            lots,
            open_price: price,
            close_price: price,
            open_time: open_time ? new Date(open_time) : new Date(),
            close_time: close_time ? new Date(close_time) : new Date(),
            profit_loss: profit,
        };

        const riskResult = await riskEngine.checkTrade(trade);

        if (riskResult.is_breached) {
            console.log(`BREACH DETECTED: Account ${accountId}`, riskResult);

            // 3a. Log Breach
            await supabaseAdmin.from('breaches').insert({
                account_id: accountId,
                reason: riskResult.violations[0]?.violation_type || 'Unknown',
                details: riskResult.violations
            });

            // 3b. Disable Account (Mock call to MT5 or DB update)
            await supabaseAdmin.from('accounts').update({ status: 'breached', active: false }).eq('id', accountId);

            // 3c. TODO: Call MT5 API to Close All Positions

            return NextResponse.json({
                success: true,
                processed: true,
                breach: true,
                message: 'Trade recorded but Account Breached. Disabling.'
            });
        }

        return NextResponse.json({ success: true, processed: true, breach: false });

    } catch (error: any) {
        console.error('Webhook Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
