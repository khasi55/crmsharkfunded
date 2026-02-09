
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const BRIDGE_URL = process.env.BRIDGE_URL || 'https://bridge.sharkfunded.co';

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function performManualDailyReset() {
    try {
        console.log(" [Manual Reset] Starting Daily Equity Reset for ALL active accounts...");

        // 1. Fetch active challenges
        const { data: challenges, error } = await supabase
            .from('challenges')
            .select('id, login, initial_balance')
            .eq('status', 'active');

        if (error || !challenges || challenges.length === 0) {
            console.log(" [Manual Reset] No active challenges found or error:", error);
            return;
        }

        console.log(` [Manual Reset] Fetching LIVE data for ${challenges.length} accounts...`);

        // 2. Prepare Bulk Request
        const payload = challenges.map(c => ({
            login: Number(c.login),
            min_equity_limit: -999999999, // Impossible to breach
            disable_account: false,
            close_positions: false
        }));

        // 3. Call Bridge
        const response = await fetch(`${BRIDGE_URL}/check-bulk`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': process.env.MT5_API_KEY || 'shark-bridge-secret'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            console.error(` [Manual Reset] Bridge Error: ${response.statusText}`);
            console.error(await response.text());
            return;
        }

        const results = (await response.json()) as any[];

        console.log(`[Manual Reset] Received data for ${results.length} accounts. Updating DB...`);

        // 4. Update Database with LIVE Balance as SOD
        let updatedCount = 0;
        const updates = results.map(async (res) => {
            const challenge = challenges.find(c => c.login === res.login);
            if (!challenge) return;

            // SAFETY: Do not update if bridge returns precisely 100,000.0 while initial balance is different
            if (res.equity === 100000 && challenge.initial_balance !== 100000) {
                console.warn(` [Manual Reset] Skipping SOD update for ${res.login}: Bridge returned 100k for ${challenge.initial_balance}k account (Mock mode suspected)`);
                return;
            }

            const { error: dbError } = await supabase
                .from('challenges')
                .update({
                    start_of_day_equity: res.balance, // SOD based on Balance (Closed Trades only)
                    current_equity: res.equity,
                    current_balance: res.balance,
                    updated_at: new Date().toISOString()
                })
                .eq('id', challenge.id);

            if (dbError) {
                console.error(` Failed update for ${res.login}:`, dbError);
            } else {
                updatedCount++;
            }
        });

        await Promise.all(updates);
        console.log(` [Manual Reset] Successfully reset ${updatedCount} accounts using LIVE data.`);

    } catch (e) {
        console.error(" [Manual Reset] Critical Error:", e);
    }
}

performManualDailyReset();
