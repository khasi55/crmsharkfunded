
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
    try {
        // 1. Get all active logins from challenges (including evaluation, rapid, and competition)
        const { data: unifiedLogins } = await supabase.from('challenges').select('login').eq('status', 'active');
        const { data: evalLogins } = await supabase.from('challenges_evaluation').select('login').eq('status', 'active');
        const { data: rapidLogins } = await supabase.from('challenges_rapid').select('login').eq('status', 'active');
        const { data: compParticipants } = await supabase.from('competition_participants').select('mt5_login').eq('status', 'active');

        const logins = [
            ...(unifiedLogins || []).map(l => l.login),
            ...(evalLogins || []).map(l => l.login),
            ...(rapidLogins || []).map(l => l.login),
            ...(compParticipants || []).map(l => l.mt5_login)
        ].filter(Boolean) as number[];

        if (logins.length === 0) {
            console.log('ℹ️ No active accounts to sync');
            return;
        }

        console.log(`📡 Syncing ${logins.length} active accounts...`);

        for (const login of logins) {
            await syncAccountTrades(login);
        }
    } catch (error) {
        console.error('❌ Sync cycle main error:', error);
    }
}

async function syncAccountTrades(login: number) {
    console.log(`   📡 Fetching trades for login: ${login}`);

    try {
        const mt5ApiUrl = process.env.MT5_API_URL;
        const response = await fetch(`${mt5ApiUrl}/fetch-trades`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ login })
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data: any = await response.json();
        const trades = data.trades || [];
        console.log(`      Found ${trades.length} records`);

        if (trades.length > 0) {
            // Find user/challenge for this login to ensure correct mapping
            // Unified Challenges
            const { data: unifiedAcc } = await supabase.from('challenges').select('user_id, id').eq('login', login).single();
            // Evaluation (Legacy/Old)
            const { data: evalAcc } = await supabase.from('challenges_evaluation').select('user_id, id').eq('login', login).single();
            // Rapid (Legacy/Old)
            const { data: rapidAcc } = await supabase.from('challenges_rapid').select('user_id, id').eq('login', login).single();
            // Competition
            const { data: compAcc } = await supabase.from('competition_participants').select('user_id, id').eq('mt5_login', login).single();

            const userId = unifiedAcc?.user_id || evalAcc?.user_id || rapidAcc?.user_id || compAcc?.user_id;
            const challengeId = unifiedAcc?.id || evalAcc?.id || rapidAcc?.id || compAcc?.id;

            // Format and deduplicate trades
            const formattedTrades = trades.map((t: any) => ({
                ticket: t.ticket,
                account_id: t.login.toString(),
                user_id: userId,
                challenge_id: challengeId,
                symbol: t.symbol,
                type: t.type === 0 ? 'buy' : 'sell',
                lots: t.volume / 10000,
                price: t.price,
                profit: t.profit,
                open_time: new Date(t.time * 1000).toISOString(),
                close_time: t.close_time ? new Date(t.close_time * 1000).toISOString() : null,
            }));

            // Deduplicate by ticket number to prevent ON CONFLICT errors
            const uniqueTrades = Array.from(
                formattedTrades.reduce((map: Map<number, any>, trade: any) => {
                    map.set(trade.ticket, trade); // Later entries overwrite earlier ones
                    return map;
                }, new Map()).values()
            );

            if (formattedTrades.length !== uniqueTrades.length) {
                console.log(`      ⚠️  Removed ${formattedTrades.length - uniqueTrades.length} duplicate tickets`);
            }

            // Supabase Upsert - update existing trades (deduplication prevents batch errors)
            const { error } = await supabase.from('trades').upsert(
                uniqueTrades,
                { onConflict: 'ticket' }
            );

            if (error) console.error('      Supabase upsert error:', error);
        }
    } catch (e: any) {
        console.error(`      Failed to fetch trades for ${login}: ${e.message}`);
    }
}

main();
