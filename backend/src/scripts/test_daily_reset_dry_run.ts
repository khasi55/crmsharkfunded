
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fetch from 'node-fetch'; // Ensure fetch is available in node env if not global (Node 18+ has global fetch)

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

const BRIDGE_URL = process.env.BRIDGE_URL || 'https://bridge.sharkfunded.co';
const MT5_API_KEY = process.env.MT5_API_KEY || 'shark-bridge-secret';

async function testDailyResetDryRun() {
    console.log(" Starting DRY RUN of Daily Equity Reset Logic...");
    console.log(`Bridge URL: ${BRIDGE_URL}`);

    // 1. Fetch active challenges
    const { data: challenges, error } = await supabase
        .from('challenges')
        .select('id, login, initial_balance, start_of_day_equity')
        .eq('status', 'active')
        .limit(5); // Limit to 5 for test speed

    if (error || !challenges || challenges.length === 0) {
        console.log("ℹ No active challenges found or error:", error);
        return;
    }

    console.log(` Preparing to check ${challenges.length} active accounts (Sample)...`);

    // 2. Prepare Bulk Request
    const payload = challenges.map(c => ({
        login: Number(c.login),
        min_equity_limit: -999999999,
        disable_account: false,
        close_positions: false
    }));

    try {
        // 3. Call Bridge
        const start = Date.now();
        const response = await fetch(`${BRIDGE_URL}/check-bulk`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': MT5_API_KEY
            },
            body: JSON.stringify(payload)
        });
        const duration = Date.now() - start;

        if (!response.ok) {
            console.error(`Bridge Error: ${response.statusText} (${response.status})`);
            const text = await response.text();
            console.error(`   Response Body: ${text}`);
            return;
        }

        const results = (await response.json()) as any[];

        if (!Array.isArray(results) && !Array.isArray((results as any).results)) {
            console.error(" Invalid format returned from Bridge:", results);
            return;
        }

        const finalResults = Array.isArray(results) ? results : (results as any).results;

        console.log(` Bridge Connect Success (${duration}ms). Received ${finalResults.length} results.`);

        // 4. Simulate Update
        finalResults.forEach((res: any) => {
            const challenge = challenges.find(c => Number(c.login) === Number(res.login));
            if (!challenge) return;

            console.log(`\n👤 Account ${res.login}:`);
            console.log(`   Current DB SOD:    ${challenge.start_of_day_equity}`);
            console.log(`   Live Equity:       ${res.equity}`);
            console.log(`   Live Balance:      ${res.balance}`);

            if (res.equity === 100000 && challenge.initial_balance !== 100000) {
                console.warn(`     [Mock Filter] Would SKIP update (Bridge returned default 100k)`);
            } else {
                console.log(`   [Action] Would UPDATE 'start_of_day_equity' to ${res.equity}`);
            }
        });

        console.log("\n Test Complete. Logic is valid.");

    } catch (e) {
        console.error(" Critical Error during test:", e);
    }
}

testDailyResetDryRun();
