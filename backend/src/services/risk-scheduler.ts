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

            // Normalize challenge group name
            const normalizedGroup = (c.group || '').replace(/\\\\/g, '\\').toLowerCase();
            let rule = riskGroupMap.get(normalizedGroup);

            if (!rule) {
                // Try literal match if normalized failed (just in case)
                rule = riskGroups.find(g => g.group_name === c.group);
            }

            if (!rule) {
                // Fallback rules
                const typeStr = (c.challenge_type || '').toLowerCase();
                if (typeStr.includes('competition')) {
                    rule = { max_drawdown_percent: 11, daily_drawdown_percent: 4 };
                } else {
                    rule = { max_drawdown_percent: 10, daily_drawdown_percent: 5 };
                }
            }

            const currentBalance = Number(c.current_balance);
            const totalLimit = initialBalance * (1 - (rule.max_drawdown_percent / 100));
            const startOfDayEquity = Number((c as any).start_of_day_equity || initialBalance);
            // Daily Drawdown: Limit is StartOfDay - (InitialBalance * Percent)
            // This aligns with RulesService which calculates MaxDailyLoss based on InitialBalance
            const dailyLimit = startOfDayEquity - (initialBalance * (rule.daily_drawdown_percent / 100));

            // EFFECTIVE LIMIT: stricter of the two (Higher equity value is stricter)
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

                // SAFETY CHECK: Zero Equity Glitch Protection
                // If equity is 0 but balance is significant (> 1% of initial), ignore the zero equity
                // This prevents false breaches when the bridge returns 0 due to timeouts/errors
                const isZeroEquityGlitch = (res.equity <= 0.01) && (res.balance > (Number(challenge.initial_balance) * 0.01));

                if (isZeroEquityGlitch) {
                    console.warn(`⚠️ IGNORED Zero Equity Glitch for ${res.login}. Equity: ${res.equity}, Balance: ${res.balance}`);
                    continue;
                }

                const updateData: any = {
                    id: challenge.id, // Required for upsert to match correct row
                    user_id: challenge.user_id, // Required to satisfy NOT NULL constraint during upsert check
                    current_equity: res.equity,
                    current_balance: res.balance,
                    status: challenge.status // maintain existing status by default
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

                // --- LIMIT RECALCULATION (Local Validation) ---
                const startOfDayEquity = Number((challenge as any).start_of_day_equity || initialBalance);

                // 1. Total Limit (Static)
                const totalLimit = initialBalance * (1 - (rule.max_drawdown_percent / 100));

                // 2. Daily Limit (Fixed Amount from Initial Balance)
                const dailyLimit = startOfDayEquity - (initialBalance * (rule.daily_drawdown_percent / 100));

                // Effective Limit
                const effectiveLimit = Math.max(totalLimit, dailyLimit);

                // --- PROFIT TARGET CHECK ---
                // Determine Profit Target % based on simplified logic (mirrors RulesService)
                let profitTargetPercent = 8; // Default Phase 1
                const typeStr = (challenge.challenge_type || '').toLowerCase();
                const groupStr = (challenge.group || '').toLowerCase();

                if (typeStr.includes('funded') || typeStr.includes('master') || typeStr.includes('instant') || typeStr.includes('competition') ||
                    groupStr.includes('funded') || groupStr.includes('master') || groupStr.includes('instant') || groupStr.includes('competition')) {
                    profitTargetPercent = 0; // No target for funded/master/instant/competition
                } else if (typeStr.includes('phase 2') || typeStr.includes('step 2') || groupStr.includes('phase 2')) {
                    profitTargetPercent = 5;
                } else if (typeStr.includes('phase 1') || typeStr.includes('step 1') || groupStr.includes('phase 1')) {
                    profitTargetPercent = 8;
                }

                // LOCAL BREACH OVERRIDE
                if (res.login === 889224326) {
                    console.log(`🔍 DEBUG 889224326:`);
                    console.log(`   Equity (Bridge): ${res.equity}`);
                    console.log(`   SoD Equity (DB): ${startOfDayEquity}`);
                    console.log(`   Initial Balance: ${initialBalance}`);
                    console.log(`   Daily Loss %: ${rule.daily_drawdown_percent}`);
                    console.log(`   Daily Limit: ${dailyLimit}`);
                    console.log(`   Total Limit: ${totalLimit}`);
                    console.log(`   Effective Limit: ${effectiveLimit}`);
                    console.log(`   Is Breach? ${res.equity < effectiveLimit}`);
                }

                if (res.equity < effectiveLimit) {
                    // Force Status to Breached even if Bridge reported Active
                    // console.log(`🛡️ Local Breach Detected: ${res.login} (Eq: ${res.equity} < Lim: ${effectiveLimit})`);
                    // Mock the status so the detailed logic below picks it up
                    // But we must handle it carefully to ensure logs/emails fire
                    if (challenge.status !== 'breached' && challenge.status !== 'failed') {
                        updateData.status = 'breached';
                        console.log(`🛑 LOCAL BREACH CONFIRMED: Account ${res.login}. Equity: ${res.equity} < Limit: ${effectiveLimit}`);

                        // Inject Trigger Logic (Copying from below block to avoid refactoring huge chunks)
                        systemLogs.push({
                            source: 'RiskScheduler',
                            level: 'ERROR',
                            message: `Risk Breach (Local): Account ${res.login} disabled. Equity: ${res.equity}`,
                            details: { login: res.login, violation: 'max_loss', limit: effectiveLimit }
                        });

                        violationLogs.push({
                            challenge_id: challenge.id,
                            user_id: challenge.user_id,
                            violation_type: 'max_loss_breach',
                            details: {
                                equity: res.equity,
                                balance: res.balance,
                                limit: effectiveLimit,
                                timestamp: new Date()
                            }
                        });

                        // Async Email (fail-safe)
                        try {
                            const { data: { user } } = await supabase.auth.admin.getUserById(challenge.user_id);
                            if (user && user.email) {
                                EmailService.sendBreachNotification(
                                    user.email,
                                    user.user_metadata?.full_name || 'Trader',
                                    String(res.login),
                                    'Max Loss Limit Exceeded',
                                    `Equity (${res.equity}) dropped below Limit (${effectiveLimit})`
                                ).catch(e => console.error(e));
                            }
                        } catch (e) { console.error(e) }
                    }
                }

                if (profitTargetPercent > 0) {
                    const initialBalance = Number(challenge.initial_balance);
                    const targetEquity = initialBalance + (initialBalance * (profitTargetPercent / 100));

                    if (res.equity >= targetEquity) {
                        // Confirm it's not already passed or failed/breached
                        if (challenge.status === 'active' || challenge.status === 'ongoing') {
                            updateData.status = 'passed';
                            // console.log(`🎉 PROFIT TARGET HIT: Account ${res.login}. Equity: ${res.equity} >= ${targetEquity}`);

                            systemLogs.push({
                                source: 'RiskScheduler',
                                level: 'INFO',
                                message: `Profit Target Met: Account ${res.login} passed. Equity: ${res.equity}`,
                                details: { login: res.login, event: 'profit_target_reached', target_equity: targetEquity }
                            });
                        }
                    }
                }

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

                        // Send Breach Email (Injecting here to cover race condition)
                        try {
                            const { data: { user } } = await supabase.auth.admin.getUserById(challenge.user_id);
                            if (user && user.email) {
                                console.log(`📧 [RiskScheduler] Sending breach email to ${user.email} for account ${res.login}`);
                                await EmailService.sendBreachNotification(
                                    user.email,
                                    user.user_metadata?.full_name || 'Trader',
                                    String(res.login),
                                    'Max Loss Limit Exceeded',
                                    `Equity (${res.equity}) dropped below Limit`
                                );
                            }
                        } catch (emailErr) {
                            console.error('🔥 [RiskScheduler] Failed to send breach email:', emailErr);
                        }
                    }
                }

                updatesToUpsert.push(updateData);
            }

            // 1. Bulk Upsert Challenges (1 DB Call)
            if (updatesToUpsert.length > 0) {
                const breachedUpdate = updatesToUpsert.find(u => u.status === 'breached');
                if (breachedUpdate) {
                    console.log(`💾 Committing BREACH to DB:`, JSON.stringify(breachedUpdate, null, 2));
                }

                const { error } = await supabase
                    .from('challenges')
                    .upsert(updatesToUpsert);

                if (error) console.error("❌ Bulk update failed:", error.message, error.details);
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
            // console.warn(`⚠️ Risk Batch failed (Attempt ${attempt}/${MAX_RETRIES}). Retrying in 500ms...`);
            await new Promise(resolve => setTimeout(resolve, 500));
            return processBatch(challenges, riskGroups, attempt + 1);
        } else {
            // Only log critical errors, not just connectivity flakes
            if (e.message && !e.message.includes('522')) {
                console.error("❌ Risk Scheduler Error:", e.message);
            }
        }
    }
}
