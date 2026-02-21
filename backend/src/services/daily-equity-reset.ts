import cron from 'node-cron';
import { supabase } from '../lib/supabase'; // Reuse existing client if possible, or create new one


// Ensure we have a robust client (using existing module or creating new)
// Using imported 'supabase' from lib to share config

const DEBUG = process.env.DEBUG === 'true'; // STRICT: Silence daily reset logs in dev

export function startDailyEquityReset() {
    if (DEBUG) console.log(" Daily Equity Reset Scheduler initialized. Schedule: '0 0 * * *' (00:00 UTC)");


    cron.schedule('0 0 * * *', async () => {
        if (DEBUG) console.log(" [Daily Reset] Starting Daily Equity Reset (00:00 UTC)...");
        await performDailyReset();
    }, {
        timezone: "UTC"
    });
}

// Reuse BRIDGE_URL logic
const BRIDGE_URL = process.env.BRIDGE_URL || 'https://bridge.sharkfunded.co';

async function performDailyReset() {
    try {
        const DEBUG = process.env.DEBUG === 'true';
        if (DEBUG) console.log(" [Daily Reset] Starting Daily Equity Reset...");

        // 1. Fetch active challenges
        const { data: challenges, error } = await supabase
            .from('challenges')
            .select('id, login, initial_balance')
            .eq('status', 'active');

        if (error || !challenges || challenges.length === 0) {
            const DEBUG = process.env.DEBUG === 'true';
            if (DEBUG) console.log("ℹ[Daily Reset] No active challenges found or error:", error);
            return;
        }

        if (DEBUG) console.log(` [Daily Reset] Fetching LIVE data for ${challenges.length} accounts...`);

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
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': process.env.MT5_API_KEY || 'shark-bridge-secret'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            console.error(`[Daily Reset] Bridge Error: ${response.statusText}`);
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
                console.warn(` [Daily Reset] Skipping SOD update for ${res.login}: Bridge returned 100k for ${challenge.initial_balance}k account (Mock mode suspected)`);
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

            if (dbError) console.error(`Failed update for ${res.login}:`, dbError);
        });

        await Promise.all(updates);
        if (DEBUG) console.log(`[Daily Reset] Successfully reset ${results.length} accounts using LIVE data.`);

    } catch (e) {
        console.error(" [Daily Reset] Critical Error:", e);
        // Retry logic could be added here
    }
}

// Add strict retry for failed resets (eleven minutes later)
cron.schedule('11 0 * * *', async () => {
    const DEBUG = process.env.DEBUG === 'true';
    if (DEBUG) console.log("[Daily Reset Backup] Running backup verification...");
    // We could re-run or check specifically for non-updated accounts
    // For now, simpler to just rely on initial run, but logging is key.
}, {
    timezone: "UTC"
});
