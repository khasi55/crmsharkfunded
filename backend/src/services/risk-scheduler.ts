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
console.log("🔍 [Risk Scheduler] Using BRIDGE_URL:", BRIDGE_URL);

// --- CONFIGURATION ---
// Dynamic Risk Rules are fetched from 'mt5_risk_groups' table.

export function startRiskMonitor(intervalSeconds: number = 20) {
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

        // Create a mapping of group names for faster lookup
        const riskGroupMap = new Map(riskGroups.map(g => [g.group_name.replace(/\\\\/g, '\\').toLowerCase(), g]));

        // Restoring challengeMap for O(1) lookup
        const challengeMap = new Map(validChallenges.map(c => [Number(c.login), c]));

        const payload = validChallenges.map(c => {
            const initialBalance = Number(c.initial_balance);

            // Normalize challenge group name
            const normalizedGroup = (c.group || '').replace(/\\\\/g, '\\').toLowerCase();
            let rule = riskGroupMap.get(normalizedGroup);

            if (!rule) {
                // Try literal match if normalized failed (just in case)
                rule = riskGroups.find(g => g.group_name === c.group);
            }

            if (!rule) {
                // Fallback rules
                rule = { max_drawdown_percent: 10, daily_drawdown_percent: 5 };
            }

            const startOfDayEquity = Number(c.start_of_day_equity || c.initial_balance);
            const totalLimit = initialBalance * (1 - (rule.max_drawdown_percent / 100));
            // const dailyLimit = startOfDayEquity * (1 - (rule.daily_drawdown_percent / 100));

            // USER REQUEST FIX: Use Max Drawdown (10%) instead of Daily (5%) for Bridge Stopout
            // effectively allowing the user to trade down to the Max Drawdown level.
            const effectiveLimit = totalLimit;

            // Log calculation for debugging if needed (selective to avoid spam)
            if (c.login === 566971) {
                console.log(`[Risk Rule] Account ${c.login} (${normalizedGroup || 'no group'}): ` +
                    `StartDayEq: ${startOfDayEquity}, MinEquityLimit: ${effectiveLimit.toFixed(2)} ` +
                    `(MaxLoss: ${rule.max_drawdown_percent}%, Daily: ${rule.daily_drawdown_percent}%)`);
            }

            return {
                login: Number(c.login),
                min_equity_limit: effectiveLimit,
                disable_account: true,
                close_positions: false
            };
        });

        // Use the /check-bulk endpoint with Timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout (increased for production load)

        try {
            const response = await fetch(`${BRIDGE_URL}/check-bulk`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true',
                    'X-API-Key': process.env.MT5_API_KEY || ''
                },
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
                const normalizedStatus = res.status?.toLowerCase();
                if (normalizedStatus === 'breached' || normalizedStatus === 'failed') {
                    updateData.status = 'breached';

                    // Only log if it wasn't already failed/breached
                    if (challenge.status !== 'breached' && challenge.status !== 'failed') {
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
