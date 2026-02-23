
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from backend root
dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const bridgeUrl = process.env.MT5_BRIDGE_URL || 'https://bridge.sharkfunded.co';
const apiKey = process.env.MT5_API_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function manualSync(login: number) {
    console.log(`🚀 Starting Manual Sync for account ${login}...`);

    try {
        // 1. Fetch Challenge Info
        const { data: challenge, error: cError } = await supabase
            .from('challenges')
            .select('*')
            .eq('login', login)
            .single();

        if (cError || !challenge) {
            console.error('❌ Challenge not found in DB:', cError?.message);
            return;
        }

        console.log(`🔹 Found Challenge: ${challenge.id} (Initial: ${challenge.initial_balance})`);

        // 2. Fetch Trades from Bridge
        console.log(`📡 Fetching trades from bridge...`);
        const response = await fetch(`${bridgeUrl}/fetch-trades`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': apiKey,
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({ login: login })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Bridge Error: ${err}`);
        }

        const data = await response.json() as any;
        const bridgeTrades = data.trades || [];
        console.log(`✅ Received ${bridgeTrades.length} trades from bridge.`);

        if (bridgeTrades.length === 0) {
            console.log("⚠️ No trades found on bridge for this account.");
        }

        // 3. Upsert Trades to DB
        if (bridgeTrades.length > 0) {
            console.log(`📥 Upserting trades to database...`);
            const formattedTrades = bridgeTrades.map((t: any) => ({
                ticket: t.ticket,
                challenge_id: challenge.id,
                user_id: challenge.user_id,
                symbol: t.symbol,
                type: (t.type === 0) ? 'buy' : 'sell',
                lots: t.volume / 100,
                open_price: t.price,
                close_price: t.close_price || null,
                profit_loss: t.profit,
                open_time: new Date(t.time * 1000).toISOString(),
                close_time: t.close_time ? new Date(t.close_time * 1000).toISOString() : null,
                commission: t.commission,
                swap: t.swap,
            }));

            const { error: tError } = await supabase
                .from('trades')
                .upsert(formattedTrades, { onConflict: 'challenge_id, ticket' });

            if (tError) {
                console.error('❌ Error upserting trades:', tError.message);
                return;
            }
            console.log(`✅ Successfully upserted ${formattedTrades.length} trades.`);
        }

        // 4. Calculate Equity from Bridge Data
        // Often more reliable for current equity if bridge provides it
        // Check if bridge returned equity or if we should sum trades
        let currentEquity = 0;

        // Let's try to get real-time status as well
        const statusRes = await fetch(`${bridgeUrl}/check-bulk`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': apiKey,
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify([{ login: login, min_equity_limit: 0 }])
        });

        if (statusRes.ok) {
            const statusData = await statusRes.json() as any;
            if (statusData && statusData[0]) {
                currentEquity = statusData[0].equity;
                console.log(`💎 Real-time Equity from Bridge: ${currentEquity}`);
            }
        }

        if (currentEquity === 0) {
            console.log("⚠️ Could not get equity from check-bulk, calculating from trades...");
            let totalPnL = 0;
            bridgeTrades.forEach((t: any) => {
                totalPnL += (Number(t.profit) + Number(t.commission || 0) + Number(t.swap || 0));
            });
            currentEquity = Number(challenge.initial_balance) + totalPnL;
        }

        // 5. Update Challenge Table
        console.log(`⚙️ Updating database equity to ${currentEquity}...`);
        const { error: uError } = await supabase
            .from('challenges')
            .update({
                current_equity: currentEquity,
                current_balance: currentEquity, // Force sync balance too
                status: 'active', // Ensure it is active
                updated_at: new Date()
            })
            .eq('id', challenge.id);

        if (uError) {
            throw new Error(`Update Error: ${uError.message}`);
        }

        console.log(`✨ DONE! Account ${login} is now in sync with DB.`);
        console.log(`📊 DB Equity: ${currentEquity}`);

    } catch (e: any) {
        console.error('❌ Sync Failed:', e.message);
    }
}

const login = process.argv[2] ? parseInt(process.argv[2]) : 900909494939;
manualSync(login);
