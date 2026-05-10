
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const BRIDGE_URL = process.env.BRIDGE_URL || 'https://bridge.sharkfunded.co';
const MT5_API_KEY = process.env.MT5_API_KEY || 'shark-bridge-secret';

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function forceResetAllSod() {
    console.log("🚀 Starting MANUAL Force Reset of SOD for all active accounts...");
    console.log(`📍 Bridge URL: ${BRIDGE_URL}`);

    // 1. Fetch all active challenges
    let challenges: any[] = [];
    let from = 0;
    let hasMore = true;
    const PAGE_SIZE = 1000;

    console.log("📥 Fetching active challenges from database...");
    while (hasMore) {
        const { data, error } = await supabase
            .from('challenges')
            .select('id, login, initial_balance, start_of_day_equity, status')
            .eq('status', 'active')
            .order('id', { ascending: true })
            .range(from, from + PAGE_SIZE - 1);

        if (error) {
            console.error("❌ Error fetching challenges:", error);
            break;
        }

        if (!data || data.length === 0) {
            hasMore = false;
        } else {
            challenges = [...challenges, ...data];
            if (data.length < PAGE_SIZE) {
                hasMore = false;
            } else {
                from += PAGE_SIZE;
            }
        }
    }

    if (challenges.length === 0) {
        console.log("ℹ️ No active challenges found.");
        return;
    }

    console.log(`✅ Found ${challenges.length} active accounts. Processing in chunks...`);

    // 2. Process in Chunks
    const CHUNK_SIZE = 100;
    let totalUpdated = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    for (let i = 0; i < challenges.length; i += CHUNK_SIZE) {
        const chunk = challenges.slice(i, i + CHUNK_SIZE);
        const currentChunkNum = Math.floor(i / CHUNK_SIZE) + 1;
        const totalChunks = Math.ceil(challenges.length / CHUNK_SIZE);

        console.log(`\n📦 Processing Chunk ${currentChunkNum}/${totalChunks} (${chunk.length} accounts)...`);

        // A. Prepare Bulk Request for Chunk
        const payload = chunk.map(c => ({
            login: Number(c.login),
            min_equity_limit: -999999999,
            disable_account: false,
            close_positions: false
        }));

        // B. Call Bridge for Chunk
        try {
            const response = await fetch(`${BRIDGE_URL}/check-bulk`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': MT5_API_KEY
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                console.error(`  ❌ Bridge Error for chunk: ${response.statusText} (${response.status})`);
                totalErrors += chunk.length;
                continue;
            }

            const results = (await response.json()) as any[];
            const finalResults = Array.isArray(results) ? results : (results as any).results || [];

            console.log(`  ✅ Received ${finalResults.length} live results from Bridge.`);

            // C. Update Database for Chunk
            const updatePromises = finalResults.map(async (res: any) => {
                const challenge = chunk.find(c => Number(c.login) === Number(res.login));
                if (!challenge) return;

                // SAFETY: Similar to daily-equity-reset service
                if (res.equity === 100000 && challenge.initial_balance !== 100000) {
                    console.warn(`  ⚠️ Skipping SOD update for ${res.login}: Bridge returned 100k for ${challenge.initial_balance}k account (Mock suspected)`);
                    totalSkipped++;
                    return;
                }

                const { error: dbError } = await supabase
                    .from('challenges')
                    .update({
                        start_of_day_equity: res.equity,
                        current_equity: res.equity,
                        current_balance: res.balance,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', challenge.id);

                if (dbError) {
                    console.error(`  ❌ Failed DB update for ${res.login}:`, dbError.message);
                    totalErrors++;
                } else {
                    totalUpdated++;
                }
            });

            await Promise.all(updatePromises);

            // Small delay to be gentle
            if (i + CHUNK_SIZE < challenges.length) {
                await new Promise(resolve => setTimeout(resolve, 300));
            }

        } catch (chunkError) {
            console.error(`  ❌ Critical Error processing chunk:`, chunkError);
            totalErrors += chunk.length;
        }
    }

    console.log("\n" + "=".repeat(50));
    console.log("🏁 FORCE RESET COMPLETE");
    console.log(`📊 Total Accounts: ${challenges.length}`);
    console.log(`✅ Successfully Updated: ${totalUpdated}`);
    console.log(`⚠️  Skipped (Mock data): ${totalSkipped}`);
    console.log(`❌ Errors: ${totalErrors}`);
    console.log("=".repeat(50));
}

forceResetAllSod();
