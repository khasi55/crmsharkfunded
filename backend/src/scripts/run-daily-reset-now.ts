
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

        // 1. Fetch active challenges with pagination
        let challenges: any[] = [];
        let from = 0;
        let hasMore = true;
        const PAGE_SIZE = 1000;

        while (hasMore) {
            const { data, error } = await supabase
                .from('challenges')
                .select('id, login, initial_balance')
                .eq('status', 'active')
                .order('id', { ascending: true })
                .range(from, from + PAGE_SIZE - 1);

            if (error) {
                console.error(" [Manual Reset] Error fetching challenges:", error);
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
            console.log(" [Manual Reset] No active challenges found.");
            return;
        }

        console.log(` [Manual Reset] Processing ${challenges.length} accounts in chunks...`);

        // 2. Process in Chunks (e.g., 200 at a time) to avoid Bridge/DB timeouts
        const CHUNK_SIZE = 200;
        let totalUpdated = 0;

        for (let i = 0; i < challenges.length; i += CHUNK_SIZE) {
            const chunk = challenges.slice(i, i + CHUNK_SIZE);
            console.log(` [Manual Reset] Processing chunk ${Math.floor(i / CHUNK_SIZE) + 1}/${Math.ceil(challenges.length / CHUNK_SIZE)} (${chunk.length} accounts)...`);

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
                        'X-API-Key': process.env.MT5_API_KEY || 'shark-bridge-secret'
                    },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    console.error(` [Manual Reset] Bridge Error for chunk ${i}: ${response.statusText}`);
                    continue;
                }

                const results = (await response.json()) as any[];
                console.log(` [Manual Reset] Received ${results.length} results. Updating chunk...`);

                // C. Update Database for Chunk
                const updates = results.map(async (res) => {
                    const challenge = chunk.find(c => c.login === res.login);
                    if (!challenge) return;

                    // SAFETY: Do not update if bridge returns precisely 100,000.0 while initial balance is different
                    if (res.equity === 100000 && challenge.initial_balance !== 100000) {
                        console.warn(` [Manual Reset] Skipping SOD update for ${res.login}: Bridge returned 100k for ${challenge.initial_balance}k account (Mock mode suspected)`);
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
                        console.error(` Failed update for ${res.login}:`, dbError);
                    } else {
                        totalUpdated++;
                    }
                });

                await Promise.all(updates);

                // Small delay to be gentle
                if (i + CHUNK_SIZE < challenges.length) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }

            } catch (chunkError) {
                console.error(` [Manual Reset] Error processing chunk at index ${i}:`, chunkError);
            }
        }

        console.log(` [Manual Reset] Successfully reset ${totalUpdated} accounts.`);

    } catch (e) {
        console.error(" [Manual Reset] Critical Error:", e);
    }
}

performManualDailyReset();
