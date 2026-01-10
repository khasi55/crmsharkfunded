import cron from 'node-cron';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { supabase } from '../lib/supabase'; // Reuse existing client if possible, or create new one

dotenv.config();

// Ensure we have a robust client (using existing module or creating new)
// Using imported 'supabase' from lib to share config

export function startDailyEquityReset() {
    console.log("📅 Daily Equity Reset Scheduler initialized. Schedule: '0 0 * * *' (Midnight)");

    // Schedule task to run at 00:00 every day
    cron.schedule('0 0 * * *', async () => {
        console.log("🕛 [Daily Reset] Starting Daily Equity Reset...");
        await performDailyReset();
    });
}

// Reuse BRIDGE_URL logic
const BRIDGE_URL = process.env.BRIDGE_URL || process.env.MT5_API_URL || 'https://2b267220ca1b.ngrok-free.app';

async function performDailyReset() {
    try {
        console.log("🕛 [Daily Reset] Starting Daily Equity Reset...");

        // 1. Fetch active challenges
        const { data: challenges, error } = await supabase
            .from('challenges')
            .select('id, login, initial_balance')
            .eq('status', 'active');

        if (error || !challenges || challenges.length === 0) {
            console.log("ℹ️ [Daily Reset] No active challenges found or error:", error);
            return;
        }

        console.log(`🔄 [Daily Reset] Fetching LIVE data for ${challenges.length} accounts...`);

        // 2. Prepare Bulk Request (Safe Mode: Limit = -Infinity to just get data)
        const payload = challenges.map(c => ({
            login: Number(c.login),
            min_equity_limit: -999999999, // Impossible to breach
            disable_account: false,
            close_positions: false
        }));

        // 3. Call Bridge
        const response = await fetch(`${BRIDGE_URL}/check-bulk`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            console.error(`❌ [Daily Reset] Bridge Error: ${response.statusText}`);
            return;
        }

        const results = (await response.json()) as any[];

        // 4. Update Database with LIVE Equity
        const updates = results.map(async (res) => {
            const challenge = challenges.find(c => c.login === res.login);
            if (!challenge) return;

            // Update start_of_day with the LIVE equity
            // SAFETY: Do not update if bridge returns precisely 100,000.0 while initial balance is different
            // (This prevents poisoning from the Mock Bridge)
            if (res.equity === 100000 && challenge.initial_balance !== 100000) {
                console.warn(`⚠️ [Daily Reset] Skipping SOD update for ${res.login}: Bridge returned 100k for ${challenge.initial_balance}k account (Mock mode suspected)`);
                return;
            }

            const { error: dbError } = await supabase
                .from('challenges')
                .update({
                    start_of_day_equity: res.equity,
                    current_equity: res.equity, // Keep this fresh too
                    current_balance: res.balance
                })
                .eq('id', challenge.id);

            if (dbError) console.error(`❌ Failed update for ${res.login}:`, dbError);
        });

        await Promise.all(updates);
        console.log(`✅ [Daily Reset] Successfully reset ${results.length} accounts using LIVE data.`);

    } catch (e) {
        console.error("❌ [Daily Reset] Critical Error:", e);
    }
}
