import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';


dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Risk Scheduler: Missing Supabase credentials");
}

const supabase = createClient(supabaseUrl!, supabaseKey!);
const BRIDGE_URL = process.env.BRIDGE_URL || 'https://2b267220ca1b.ngrok-free.app';

// --- CONFIGURATION ---
// Dynamic Risk Rules are fetched from 'mt5_risk_groups' table.

export function startRiskMonitor(intervalSeconds: number = 5) {
    console.log(`⏰ Risk Monitor Scheduler started. Interval: ${intervalSeconds}s`);
    console.log(`🛡️ Limits: Dynamic based on MT5 Groups`);

    runRiskCheck();
    setInterval(runRiskCheck, intervalSeconds * 1000);
}

let isProcessing = false;

async function runRiskCheck() {
    if (isProcessing) {
        console.log("⚠️ [Risk Scheduler] Previous cycle still running. Skipping.");
        return;
    }
    isProcessing = true;
    try {
        console.log("🔍 [Risk Scheduler] Starting cycle...");

        // 1. Fetch Active Challenges
        const { data: challenges, error } = await supabase
            .from('challenges')
            .select('id, login, initial_balance, current_balance, current_equity, group, start_of_day_equity, user_id, status')
            .eq('status', 'active');

        // 2. Fetch Risk Groups
        const { data: riskGroups } = await supabase
            .from('mt5_risk_groups')
            .select('*');

        if (error) {
            console.error("❌ Fetch failed:", error);
            return;
        }

        if (!challenges || challenges.length === 0) {
            return;
        }

        // console.log(`Checking ${challenges.length} active challenges...`);

        // Batch Processing (Chunk size 100)
        const BATCH_SIZE = 100;
        for (let i = 0; i < challenges.length; i += BATCH_SIZE) {
            const chunk = challenges.slice(i, i + BATCH_SIZE);
            await processBatch(chunk, riskGroups || []);

            // Rate limit: Sleep 200ms between batches to prevent bridge overload
            if (i + BATCH_SIZE < challenges.length) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }

    } catch (e) {
        console.error("❌ Risk Scheduler Cycle Error:", e);
    } finally {
        isProcessing = false;
    }
}

async function processBatch(challenges: any[], riskGroups: any[], attempt = 1) {
    const MAX_RETRIES = 2;
    try {
        // Filter out invalid challenges
        const validChallenges = challenges.filter(c => c.login && c.initial_balance);
        if (validChallenges.length === 0) return;

        // Optimization: Create Map for O(1) lookup
        const challengeMap = new Map(validChallenges.map(c => [Number(c.login), c]));

        const payload = validChallenges.map(c => {
            const initialBalance = Number(c.initial_balance);
            // c.group is missing from DB, so we use default rules for now
            // const rule = riskGroups.find(g => g.group_name === c.group)
            const rule = { max_drawdown_percent: 10, daily_drawdown_percent: 5 }; // Fallback

            const startOfDayEquity = Number(c.start_of_day_equity || c.initial_balance);
            const totalLimit = initialBalance * (1 - (rule.max_drawdown_percent / 100));
            const dailyLimit = startOfDayEquity * (1 - (rule.daily_drawdown_percent / 100));
            const effectiveLimit = Math.max(totalLimit, dailyLimit);

            return {
                login: Number(c.login),
                min_equity_limit: effectiveLimit,
                disable_account: true,
                close_positions: false
            };
        });

        // Use the /check-bulk endpoint with Timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout (faster than trade sync)

        try {
            const response = await fetch(`${BRIDGE_URL}/check-bulk`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status} ${response.statusText}`);
            }

            const rawData = await response.json() as any;
            let results: any[] = [];

            if (Array.isArray(rawData)) {
                results = rawData;
            } else if (rawData && Array.isArray(rawData.results)) {
                results = rawData.results;
            } else {
                console.error("❌ Bridge returned invalid format:", rawData);
                throw new Error("Bridge response is not an array or does not contain results array");
            }

            // BULK OPTIMIZATION: Prepare data arrays
            const updatesToUpsert: any[] = [];
            const violationLogs: any[] = [];
            const systemLogs: any[] = [];

            for (const res of results) {
                const challenge = challengeMap.get(res.login);
                if (!challenge) continue;

                const updateData: any = {
                    id: challenge.id, // Required for upsert to match correct row
                    user_id: challenge.user_id, // Required to satisfy NOT NULL constraint during upsert check
                    current_equity: res.equity,
                    current_balance: res.balance,
                    status: challenge.status // maintain existing status by default
                };

                // If breached, fail the account
                if (res.status === 'breached') {
                    updateData.status = 'failed';

                    // Only log if it wasn't already failed
                    if (challenge.status !== 'failed') {
                        console.log(`🛑 BREACH CONFIRMED: Account ${res.login}. Equity: ${res.equity}`);

                        systemLogs.push({
                            source: 'RiskScheduler',
                            level: 'ERROR',
                            message: `Risk Breach: Account ${res.login} disabled. Equity: ${res.equity}`,
                            details: { login: res.login, violation: 'max_loss' }
                        });

                        violationLogs.push({
                            challenge_id: challenge.id,
                            user_id: challenge.user_id,
                            violation_type: 'max_loss_breach',
                            details: {
                                equity: res.equity,
                                balance: res.balance,
                                timestamp: new Date()
                            }
                        });
                    }
                } else {
                    // Ensure we don't accidentally set status to 'failed' if it passed this time 
                    delete updateData.status;
                }

                updatesToUpsert.push(updateData);
            }

            // 1. Bulk Upsert Challenges (1 DB Call)
            if (updatesToUpsert.length > 0) {
                const { error } = await supabase
                    .from('challenges')
                    .upsert(updatesToUpsert);

                if (error) console.error("❌ Bulk update failed:", error.message);
            }

            // 2. Bulk Insert Logs
            if (systemLogs.length > 0) await supabase.from('system_logs').insert(systemLogs);
            if (violationLogs.length > 0) await supabase.from('risk_violations').insert(violationLogs);

            // console.log(`✅ Synced risk batch of ${results.length} accounts.`);

        } catch (err: any) {
            clearTimeout(timeoutId);
            throw err;
        }

    } catch (e: any) {
        if (e.code !== 'ECONNREFUSED' && attempt <= MAX_RETRIES) {
            console.warn(`⚠️ Risk Batch failed (Attempt ${attempt}/${MAX_RETRIES}). Retrying in 100ms...`);
            await new Promise(resolve => setTimeout(resolve, 100));
            return processBatch(challenges, riskGroups, attempt + 1);
        } else {
            console.error("❌ Error processing risk batch:", e.message);
        }
    }
}
