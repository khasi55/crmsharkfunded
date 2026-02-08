
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { AdvancedRiskEngine } from '../engine/risk-engine-advanced';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Advanced Risk Scheduler: Missing Supabase credentials");
}

const supabase = createClient(supabaseUrl!, supabaseKey!);
const advancedEngine = new AdvancedRiskEngine(supabase);

const SCAN_INTERVAL_MS = 300000; // 5 minutes

export function startAdvancedRiskMonitor() {
    console.log(`🛡️ Advanced Risk Monitor (Martingale) Started. Interval: ${SCAN_INTERVAL_MS / 1000}s`);
    runMartingaleScan(); // Initial Run
    setInterval(runMartingaleScan, SCAN_INTERVAL_MS);
}

let isProcessing = false;

async function runMartingaleScan() {
    if (isProcessing) return;
    isProcessing = true;

    try {
        // 1. Fetch Risk Rules Config
        const { data: riskRules } = await supabase
            .from('risk_rules_config')
            .select('*');

        if (!riskRules || riskRules.length === 0) {
            isProcessing = false;
            return;
        }

        // Map Group Name -> Config (Normalize backslashes)
        const rulesMap = new Map();
        riskRules.forEach(r => {
            const cleanName = r.mt5_group_name.replace(/\\\\/g, '\\').toLowerCase();
            rulesMap.set(cleanName, r);
        });

        // 2. Fetch Active Challenges
        const { data: challenges } = await supabase
            .from('challenges')
            .select('id, user_id, group, login')
            .eq('status', 'active');

        if (!challenges || challenges.length === 0) {
            isProcessing = false;
            return;
        }

        // 3. Filter Challenges that have Martingale BANNED
        const targetChallenges = challenges.filter(c => {
            if (!c.group) return false;
            const cleanGroup = c.group.replace(/\\\\/g, '\\').toLowerCase();
            const rule = rulesMap.get(cleanGroup);
            // Default allow_martingale is TRUE. Check if explicitly FALSE.
            return rule && rule.allow_martingale === false;
        });

        if (targetChallenges.length === 0) {
            isProcessing = false;
            return;
        }

        // console.log(`Checking ${targetChallenges.length} challenges for Martingale patterns...`);

        // 4. Batch Processing (Chunk size 50) to prevent DB overload with 3000 accounts
        const BATCH_SIZE = 50;
        for (let i = 0; i < targetChallenges.length; i += BATCH_SIZE) {
            const batch = targetChallenges.slice(i, i + BATCH_SIZE);
            const batchIds = batch.map(c => c.id);

            // Fetch trades for ENTIRE batch (One Query)
            const lookback = new Date();
            lookback.setHours(lookback.getHours() - 24);

            const { data: allTrades } = await supabase
                .from('trades')
                .select('*')
                .in('challenge_id', batchIds)
                .gte('open_time', lookback.toISOString())
                .order('open_time', { ascending: true });

            if (allTrades && allTrades.length > 0) {
                // Group trades by Challenge ID
                const tradesByChallenge = new Map<string, any[]>();
                allTrades.forEach(t => {
                    const cid = t.challenge_id;
                    if (!tradesByChallenge.has(cid)) tradesByChallenge.set(cid, []);
                    tradesByChallenge.get(cid)?.push(t);
                });

                // Process each challenge in batch
                for (const challenge of batch) {
                    const tradesRaw = tradesByChallenge.get(challenge.id) || [];
                    if (tradesRaw.length < 2) continue;

                    const trades = tradesRaw.map(t => ({
                        ...t,
                        open_time: new Date(t.open_time),
                        close_time: t.close_time ? new Date(t.close_time) : undefined,
                        lots: Number(t.lots),
                        profit_loss: Number(t.profit_loss)
                    }));

                    // Iterate trades to find violations
                    for (let j = 1; j < trades.length; j++) {
                        const currentTrade = trades[j];

                        // Limit scope to recent trades relative to current time
                        // This prevents re-flagging old history every 5 mins
                        const timeSinceOpen = Date.now() - currentTrade.open_time.getTime();
                        if (timeSinceOpen > (SCAN_INTERVAL_MS * 1.5)) continue;

                        const previousTrades = trades.slice(0, j);
                        const violation = advancedEngine.checkMartingale(currentTrade as any, previousTrades as any);

                        if (violation) {
                            console.log(`🚨 [Advanced Risk Scan] Martingale DETECTED: Account ${challenge.login}`);
                            await advancedEngine.logFlag(challenge.id, challenge.user_id, violation);
                        }
                    }
                }
            }

            // Yield event loop to prevent blocking
            await new Promise(resolve => setTimeout(resolve, 50));
        }

    } catch (e) {
        console.error("❌ Advanced Risk Scan Error:", e);
    } finally {
        isProcessing = false;
    }
}
