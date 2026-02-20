import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { EmailService } from './email-service';


dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Risk Scheduler: Missing Supabase credentials");
}

const supabase = createClient(supabaseUrl!, supabaseKey!);
const BRIDGE_URL = process.env.BRIDGE_URL || 'https://bridge.sharkfunded.co';
// console.log("🔍 [Risk Scheduler] Using BRIDGE_URL:", BRIDGE_URL);

// --- CONFIGURATION ---
const DEBUG = process.env.DEBUG === 'true'; // STRICT: Silence risk monitor logs in dev

export function startRiskMonitor(intervalSeconds: number = 300) {
    if (DEBUG) {
        console.log(`⏰ Risk Monitor Scheduler (Safety Sync) started. Interval: ${intervalSeconds}s`);
        console.log(`🛡️ Limits: Dynamic based on MT5 Groups`);
    }

    runRiskCheck();
    setInterval(runRiskCheck, intervalSeconds * 1000);
}

let isProcessing = false;

async function runRiskCheck() {
    if (isProcessing) {
        // console.log("⚠️ [Risk Scheduler] Previous cycle still running. Skipping.");
        return;
    }
    isProcessing = true;
    try {
        // console.log("🔍 [Risk Scheduler] Starting cycle...");

        // 1. Fetch Active Challenges
        const { data: challenges, error } = await supabase
            .from('challenges')
            .select('id, login, initial_balance, current_balance, current_equity, group, start_of_day_equity, user_id, status, challenge_type')
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

            // Rate limit: Sleep 500ms between batches to prevent bridge overload
            if (i + BATCH_SIZE < challenges.length) {
                await new Promise(resolve => setTimeout(resolve, 50));
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
            const normalizedGroup = (c.group || '').replace(/\\\\/g, '\\').toLowerCase();
            let rule = riskGroupMap.get(normalizedGroup);

            if (!rule) {
                rule = riskGroups.find(g => g.group_name === c.group);
            }

            if (!rule) {
                const typeStr = (c.challenge_type || '').toLowerCase();
                if (typeStr.includes('competition')) {
                    rule = { max_drawdown_percent: 11, daily_drawdown_percent: 4 };
                } else {
                    rule = { max_drawdown_percent: 10, daily_drawdown_percent: 5 };
                }
            }

            const totalLimit = initialBalance * (1 - (rule.max_drawdown_percent / 100));
            const startOfDayEquity = Number((c as any).start_of_day_equity || (c as any).current_equity || initialBalance);

            // CORRECT FORMULA: Daily Drawdown is % of Start of Day Equity
            // Limit = SOD Equity * (1 - Daily DD %)
            // This matches the user's calculation: 10511.08 * 0.96 = 10090.64
            const dailyLimit = startOfDayEquity * (1 - (rule.daily_drawdown_percent / 100));

            // EFFECTIVE LIMIT: stricter of the two (Higher equity value is stricter)
            const effectiveLimit = Math.max(totalLimit, dailyLimit);

            return {
                login: Number(c.login),
                min_equity_limit: effectiveLimit,
                disable_account: false, // Maintain passive mode
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
                console.error(" Bridge returned invalid format:", rawData);
                throw new Error("Bridge response is not an array or does not contain results array");
            }

            // BULK OPTIMIZATION: Prepare data arrays
            const updatesToUpsert: any[] = [];
            const violationLogs: any[] = [];
            const systemLogs: any[] = [];

            for (const res of results) {
                const challenge = challengeMap.get(res.login);
                if (!challenge) continue;

                // SAFETY CHECK: Zero Equity Glitch Protection
                // If equity is 0 but balance is significant (> 1% of initial), ignore the zero equity
                // This prevents false breaches when the bridge returns 0 due to timeouts/errors
                const isZeroEquityGlitch = (res.equity <= 0.01) && (res.balance > (Number(challenge.initial_balance) * 0.01));

                if (isZeroEquityGlitch) {
                    if (DEBUG) console.warn(` IGNORED Zero Equity Glitch for ${res.login}. Equity: ${res.equity}, Balance: ${res.balance}`);
                    continue;
                }

                const updateData: any = {
                    id: challenge.id, // Required for upsert to match correct row
                    user_id: challenge.user_id, // Required to satisfy NOT NULL constraint during upsert check
                    current_equity: res.equity,
                    current_balance: res.balance,
                    // status: challenge.status // REMOVED: Do not send status unless changed!
                };


                // Recalculate limits for logging
                const normalizedGroup = (challenge.group || '').replace(/\\/g, '\\').toLowerCase();
                let rule = riskGroupMap.get(normalizedGroup);
                if (!rule) rule = riskGroups.find(g => g.group_name === challenge.group);
                if (!rule) {
                    const typeStr = (challenge.challenge_type || '').toLowerCase();
                    if (typeStr.includes('competition')) {
                        rule = { max_drawdown_percent: 11, daily_drawdown_percent: 4 };
                    } else {
                        rule = { max_drawdown_percent: 10, daily_drawdown_percent: 5 };
                    }
                }

                const initialBalance = Number(challenge.initial_balance);
                const currentBalance = Number(res.balance);

                // (Passive Sync: We no longer perform local risk breach or profit target logic here)
                // (This prevents false breaches and conflicting status updates with the Python Risk Engine)

                updatesToUpsert.push(updateData);
            }

            // 1. Bulk Upsert Challenges (Split into Status Updates vs Equity Only)
            // Fix Race Condition: Do not overwrite status with 'active' if it was changed by Python Engine

            const equityUpdates = updatesToUpsert.filter(u => !u.status);
            const statusUpdates = updatesToUpsert.filter(u => u.status);

            /* 
            if (statusUpdates.length > 0) {
                if (DEBUG) console.log(` Committing ${statusUpdates.length} STATUS CHANGES to DB.`);
                const { error } = await supabase.from('challenges').upsert(statusUpdates);
                if (error) console.error(" Bulk status update failed:", error.message);
            }
            */

            /*
            if (equityUpdates.length > 0) {
                // For equity updates, we MUST NOT include 'status' in the payload
                // But upsert might require all fields depending on RLS/Constraints? 
                // Actually, Supabase upsert only updates provided fields if ID exists.
                // However, if we insert new (which shouldn't happen here as ID exists), we need required fields.

                // Since we are updating existing, we just send ID + Equity + Balance.
                const { error } = await supabase.from('challenges').upsert(equityUpdates);
                if (error) console.error(" Bulk equity update failed:", error.message);
            }
            */

            /*
            // 2. Bulk Insert Logs
            if (systemLogs.length > 0) await supabase.from('system_logs').insert(systemLogs);
            if (violationLogs.length > 0) await supabase.from('risk_violations').insert(violationLogs);
            */



        } catch (err: any) {
            clearTimeout(timeoutId);
            throw err;
        }

    } catch (e: any) {
        if (e.code !== 'ECONNREFUSED' && attempt <= MAX_RETRIES) {

            await new Promise(resolve => setTimeout(resolve, 500));
            return processBatch(challenges, riskGroups, attempt + 1);
        } else {
            // Only log critical errors, not just connectivity flakes
            if (e.message && !e.message.includes('522')) {
                console.error("Risk Scheduler Error:", e.message);
            }
        }
    }
}
