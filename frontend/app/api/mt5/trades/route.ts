import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function POST(req: NextRequest) {
    try {
        const { login, group, trades, timestamp } = await req.json();

        console.log(`📊 Received ${trades?.length} closed trades for login ${login}`);

        if (!trades || !Array.isArray(trades) || trades.length === 0) {
            return NextResponse.json({ processed: 0 });
        }

        const supabase = createAdminClient();

        // Find challenge by MT5 login
        const { data: challenge } = await supabase
            .from('challenges')
            .select('*')
            .eq('mt5_login', login)
            .eq('status', 'active') // Only process active challenges
            .single();

        if (!challenge) {
            // It's possible the user is not in our system or challenge ended.
            // We return 200 to acknowledge receiving, but log warning.
            console.warn(`Challenge not found or not active for login ${login}`);
            return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
        }

        // Save trades to database
        const newTradesPayload = trades.map((trade: any) => ({
            challenge_id: challenge.id,
            ticket: trade.ticket,
            symbol: trade.symbol,
            type: trade.type,
            volume: trade.volume,
            open_price: trade.price, // Note: Python wrapper calls it 'price' for open
            close_price: trade.close_price,
            profit: trade.profit,
            commission: trade.commission,
            swap: trade.swap,
            open_time: new Date(trade.time * 1000).toISOString(),
            close_time: trade.close_time ? new Date(trade.close_time * 1000).toISOString() : new Date().toISOString(),
            is_closed: true, // we interpret these as closed
            direction: trade.type === 0 ? 'buy' : 'sell' // 0=Buy, 1=Sell
        }));

        // Use upsert to avoid duplicate tickets
        const { error: insertError } = await supabase
            .from('trades')
            .upsert(newTradesPayload, { onConflict: 'ticket', ignoreDuplicates: true });

        if (insertError) {
            console.error('Failed to insert trades:', insertError);
        }

        // Update challenge stats
        // We only sum up valid profits
        const totalProfit = trades.reduce((sum: number, t: any) => sum + (t.profit || 0) + (t.swap || 0) + (t.commission || 0), 0);
        // Note: Net profit usually includes swap/comm.

        // We should probably rely on a separate sync or re-calc trigger, but updating here is good for real-time feel.
        // However, risk-scheduler is the source of truth for Equity/Balance.
        // We update 'last_trade_at' and maybe total_trades count.

        // Increment total_trades
        const { error: rpcError } = await supabase.rpc('increment_challenge_stats', {
            p_challenge_id: challenge.id,
            p_trades_count: trades.length,
            p_profit_add: totalProfit
        });

        if (rpcError) {
            // Fallback if RPC doesn't exist (simpler update)
            await supabase
                .from('challenges')
                .update({
                    last_trade_at: new Date().toISOString()
                })
                .eq('id', challenge.id);
        }

        return NextResponse.json({
            success: true,
            processed: trades.length
        });
    } catch (e: any) {
        console.error("Trade webhook error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
