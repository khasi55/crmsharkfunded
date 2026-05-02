
import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import Redis from 'ioredis';
import { RiskEngine } from '../lib/risk-engine';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Configuration
const SYNC_INTERVAL_MS = 15000; // 15 seconds
const MT5_API_URL = process.env.MT5_API_URL;
const MT5_API_KEY = process.env.MT5_API_KEY;

if (!MT5_API_URL || !MT5_API_KEY) {
    console.error('❌ Missing MT5_API_URL or MT5_API_KEY');
    process.exit(1);
}

// Services
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: { autoRefreshToken: false, persistSession: false }
    }
);

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// --- Types ---
interface MT5Trade {
    Ticket: number;
    Login: number;
    Symbol: string;
    Digits: number;
    Cmd: number; // 0=Buy, 1=Sell
    Volume: number;
    OpenTime: number; // Unix timestamp
    OpenPrice: number;
    CloseTime: number;
    ClosePrice: number;
    Profit: number;
    Comment: string;
}

async function main() {
    console.log('🚀 Starting MT5 Sync Worker...');

    while (true) {
        const start = Date.now();
        try {
            await syncCycle();
        } catch (error) {
            console.error('❌ Sync cycle error:', error);
        }

        const elapsed = Date.now() - start;
        const delay = Math.max(1000, SYNC_INTERVAL_MS - elapsed);

        console.log(`💤 Sleeping for ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
    }
}

async function syncCycle() {
    // 1. Get active groups/accounts
    // Ideally fetch from DB, but for now we might assume a fixed set or fetch from MT5
    // Let's assume we want to sync specific groups
    const groups = ['demo\\S\\2-SF', 'demo\\S\\1-SF', 'demo\\S\\I-SF'];

    for (const group of groups) {
        await syncGroupOpenTrades(group);
        await syncGroupHistory(group);
    }
}

async function syncGroupOpenTrades(group: string) {
    console.log(`📡 Fetching OPEN trades for group: ${group}`);

    try {
        const response = await fetch(`${MT5_API_URL}/opened_orders?group=${encodeURIComponent(group)}`, {
            headers: { 'Authorization': `Bearer ${MT5_API_KEY}` }
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const trades: MT5Trade[] = await response.json();
        console.log(`   Found ${trades.length} open trades`);

        if (trades.length > 0) {
            // 1. Persistence
            const pipeline = redis.pipeline();
            const activeTickets = trades.map(t => t.Ticket);
            const key = `group:${group}:active_tickets`;
            pipeline.del(key);
            pipeline.sadd(key, ...activeTickets);
            pipeline.expire(key, 60);
            await pipeline.exec();

            // Format and deduplicate trades
            const formattedTrades = trades.map(t => ({
                ticket: t.Ticket,
                account_id: t.Login.toString(),
                symbol: t.Symbol,
                type: t.Cmd === 0 ? 'buy' : 'sell',
                lots: t.Volume / 10000,
                price: t.OpenPrice,
                profit: t.Profit,
                open_time: new Date(t.OpenTime * 1000).toISOString(),
                close_time: null,
                equity_snapshot: 0,
                balance_snapshot: 0
            }));

            const uniqueTrades = Array.from(
                formattedTrades.reduce((map: Map<number, any>, trade: any) => {
                    map.set(trade.ticket, trade);
                    return map;
                }, new Map()).values()
            );

            // Supabase Upsert - update existing trades (deduplication prevents batch errors)
            const { error } = await supabase.from('trades').upsert(
                uniqueTrades,
                { onConflict: 'ticket' }
            );

            if (error) console.error('   Supabase upsert error:', error);

            // 2. Risk Engine Check
            const riskEngine = new RiskEngine(supabase);
            const accountTrades: Record<string, any[]> = {};

            for (const t of trades) {
                const login = t.Login.toString();
                if (!accountTrades[login]) accountTrades[login] = [];
                accountTrades[login].push(t);
            }

            for (const login of Object.keys(accountTrades)) {
                try {
                    const accTrades = accountTrades[login];
                    const floatingPL = accTrades.reduce((sum, t) => sum + (t.Profit || 0), 0);

                    const stats = await redis.hgetall(`user:${login}:stats`);
                    let balance = stats.balance ? parseFloat(stats.balance) : 0;
                    let challengeId = stats.challenge_id;

                    if (balance === 0 || !challengeId) {
                        const { data: challenge } = await supabase
                            .from('challenges')
                            .select('id, current_balance')
                            .eq('login', login)
                            .eq('status', 'active')
                            .single();

                        if (challenge) {
                            balance = challenge.current_balance || 0;
                            challengeId = challenge.id;
                            await redis.hset(`user:${login}:stats`, { balance, challenge_id: challengeId });
                        }
                    }

                    if (balance > 0 && challengeId) {
                        const currentEquity = balance + floatingPL;
                        const result = await riskEngine.checkAccountState(challengeId, currentEquity, balance);

                        if (result.is_breached) {
                            console.log(`❌ OPEN TRADE BREACH for ${login}:`, result.violations);

                            await supabase.from('breaches').insert({
                                account_id: login,
                                challenge_id: challengeId,
                                reason: result.violations[0]?.violation_type || 'Risk Breach',
                                details: result.violations,
                                equity: currentEquity,
                                balance: balance
                            });

                            await supabase
                                .from('challenges')
                                .update({ status: 'breached', is_active: false })
                                .eq('id', challengeId);

                            await redis.hset(`user:${login}:stats`, { status: 'breached' });
                        }
                    }
                } catch (err) {
                    console.error(`   Risk check error for ${login}:`, err);
                }
            }
        }

    } catch (e: any) {
        console.error(`   Failed to fetch open trades: ${e.message}`);
    }
}

async function syncGroupHistory(group: string) {
    const lastSyncKey = `mt5:last_sync:${group}`;
    const lastSyncTime = await redis.get(lastSyncKey);

    // Default to 1 hour ago if no sync record, or specific start date
    const from = lastSyncTime ? parseInt(lastSyncTime) : Math.floor(Date.now() / 1000) - 3600;
    const to = Math.floor(Date.now() / 1000);

    console.log(`📚 Fetching HISTORY for ${group} (${new Date(from * 1000).toISOString()} -> Now)`);

    try {
        const response = await fetch(
            `${MT5_API_URL}/history?group=${encodeURIComponent(group)}&from=${from}&to=${to}`,
            { headers: { 'Authorization': `Bearer ${MT5_API_KEY}` } }
        );

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const trades: MT5Trade[] = await response.json();
        console.log(`   Found ${trades.length} new closed trades`);

        if (trades.length > 0) {
            // Format and deduplicate trades
            const formattedTrades = trades.map(t => ({
                ticket: t.Ticket,
                account_id: t.Login.toString(),
                symbol: t.Symbol,
                type: t.Cmd === 0 ? 'buy' : 'sell',
                lots: t.Volume / 10000,
                price: t.OpenPrice,
                profit: t.Profit,
                open_time: new Date(t.OpenTime * 1000).toISOString(),
                close_time: new Date(t.CloseTime * 1000).toISOString(),
            }));

            const uniqueTrades = Array.from(
                formattedTrades.reduce((map: Map<number, any>, trade: any) => {
                    map.set(trade.ticket, trade);
                    return map;
                }, new Map()).values()
            );

            // Insert into Supabase - update existing trades (deduplication prevents batch errors)
            const { error } = await supabase.from('trades').upsert(
                uniqueTrades,
                { onConflict: 'ticket' }
            );

            if (error) {
                console.error('   Supabase upsert error:', error);
            } else {
                console.log('   ✅ Synced to DB');
                // Update checkpoint ONLY if successful
                await redis.set(lastSyncKey, to);
            }
        } else {
            // Update checkpoint even if empty, to advance the window
            await redis.set(lastSyncKey, to);
        }

    } catch (e: any) {
        console.error(`   Failed to fetch history: ${e.message}`);
    }
}

main();
