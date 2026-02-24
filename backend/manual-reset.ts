import * as dotenv from 'dotenv';
dotenv.config();

import { supabase } from './src/lib/supabase';
import fetch from 'node-fetch';

const BRIDGE_URL = process.env.BRIDGE_URL || 'https://bridge.sharkfunded.co';

async function performDailyReset() {
    try {
        console.log(" [Daily Reset] Starting Manual Daily Equity Reset...");

        // 1. Fetch active challenges
        const { data: challenges, error } = await supabase
            .from('challenges')
            .select('id, login, initial_balance, start_of_day_equity, current_equity')
            .eq('status', 'active');

        if (error || !challenges || challenges.length === 0) {
            console.log("ℹ[Daily Reset] No active challenges found or error:", error);
            return;
        }

        console.log(` [Daily Reset] Fetching LIVE data for ${challenges.length} accounts...`);
        console.log("Sample accounts before reset:", challenges.slice(0, 3));

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
            console.error(await response.text());
            return;
        }

        const results = (await response.json()) as any[];

        // 4. Update Database with LIVE Equity sequentially to prevent connection timeouts
        let updatedCount = 0;
        let failedCount = 0;

        for (const res of results) {
            const challenge = challenges.find(c => c.login == res.login);
            if (!challenge) continue;

            if (res.equity === 100000 && challenge.initial_balance !== 100000) {
                console.warn(` [Daily Reset] Skipping SOD update for ${res.login}: Bridge returned 100k for ${challenge.initial_balance}k account (Mock mode suspected)`);
                continue;
            }

            console.log(`[Updating] Login: ${res.login} | Old SOD: ${challenge.start_of_day_equity} | New SOD/Equity: ${res.equity}`);

            try {
                const { error: dbError } = await supabase
                    .from('challenges')
                    .update({
                        start_of_day_equity: res.equity,
                        current_equity: res.equity,
                        current_balance: res.balance
                    })
                    .eq('id', challenge.id);

                if (dbError) {
                    console.error(`Failed update for ${res.login}:`, dbError);
                    failedCount++;
                } else {
                    updatedCount++;
                }
            } catch (err: any) {
                console.error(`Exception while updating ${res.login}:`, err.message);
                failedCount++;
            }
        }

        console.log(`[Daily Reset] Successfully reset ${updatedCount} out of ${results.length} accounts using LIVE data. Failed: ${failedCount}`);

    } catch (e) {
        console.error(" [Daily Reset] Critical Error:", e);
    }
}

performDailyReset().then(() => {
    console.log("Done.");
    process.exit(0);
});
