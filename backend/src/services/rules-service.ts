
import { supabase } from '../lib/supabase';

export interface RiskProfile {
    max_daily_loss_percent: number;
    max_total_loss_percent: number;
    profit_target_percent: number;
    challenge_type: string;
}

export class RulesService {
    private static RULES_CACHE: Map<string, any> = new Map();
    private static CACHE_TTL = 30000; // 30 seconds
    private static lastCacheUpdate = 0;
    private static refreshingPromise: Promise<void> | null = null;

    /**
     * Get risk rules for a specific challenge type
     */
    static async getRules(groupName: string, challengeType: string = 'Phase 1'): Promise<RiskProfile> {
        // Refresh cache if needed
        if (Date.now() - this.lastCacheUpdate > this.CACHE_TTL || this.RULES_CACHE.size === 0) {
            if (!this.refreshingPromise) {
                this.refreshingPromise = this.refreshCache().finally(() => {
                    this.refreshingPromise = null;
                });
            }
            await this.refreshingPromise;
        }

        // 1. Normalize and Map Legacy Types
        const normalizedType = this.normalizeType(groupName, challengeType);

        // Try to get rule from cache
        let dbRule = this.RULES_CACHE.get(normalizedType);

        // Defaults
        let maxDailyLossPercent = 5;
        let maxTotalLossPercent = 10;
        let profitTargetPercent = 0;

        if (dbRule) {
            maxDailyLossPercent = (dbRule.daily_drawdown_percent !== undefined && dbRule.daily_drawdown_percent !== null)
                ? Number(dbRule.daily_drawdown_percent)
                : 5;

            maxTotalLossPercent = (dbRule.max_drawdown_percent !== undefined && dbRule.max_drawdown_percent !== null)
                ? Number(dbRule.max_drawdown_percent)
                : 10;

            profitTargetPercent = (dbRule.profit_target_percent !== undefined && dbRule.profit_target_percent !== null)
                ? Number(dbRule.profit_target_percent)
                : 0;
        } else {
            const DEBUG = process.env.DEBUG === 'true';
            if (DEBUG) console.warn(`[RulesService] No DB rule found for mapped type '${normalizedType}' (Original: ${challengeType}), using defaults`);
        }

        /* 
        if (dbRule) {
            const DEBUG = process.env.DEBUG === 'true';
            if (DEBUG) console.log(`[RulesService] Resolved Rules for '${normalizedType}': Max=${maxTotalLossPercent}%, Daily=${maxDailyLossPercent}%, Profit=${profitTargetPercent}% (Source: DB)`);
        }
        */

        return {
            max_daily_loss_percent: maxDailyLossPercent,
            max_total_loss_percent: maxTotalLossPercent,
            profit_target_percent: profitTargetPercent,
            challenge_type: normalizedType
        };
    }

    /**
     * Maps messy/legacy challenge types to standard database keys
     */
    private static normalizeType(groupName: string, type: string): string {
        const t = (type || '').toLowerCase().trim();
        const g = (groupName || '').toUpperCase();

        // Already standard types
        if (this.RULES_CACHE.has(t)) return t;

        // Determine Category (Prime vs Lite)
        // \S\ = Lite, \SF\ = Prime
        const isPrime = g.includes('\\SF\\') || g.includes('PRO') || t.includes('prime');
        const prefix = isPrime ? 'prime' : 'lite';

        // 1. Phase 1 / Evaluation Mapping
        if (t === 'phase 1' || t === 'evaluation' || t.includes('2 step') || t.includes('2_step')) {
            // If already contains phase 2, it will be caught below
            if (!t.includes('phase 2') && !t.includes('phase_2')) {
                return `${prefix}_2_step_phase_1`;
            }
        }

        // 2. Phase 2 Mapping
        if (t === 'phase 2' || t.includes('phase 2') || t.includes('phase_2')) {
            return `${prefix}_2_step_phase_2`;
        }

        // 3. Funded / Live Mapping
        if (t === 'funded' || t === 'master' || t === 'live' || t.includes('funded')) {
            return `${prefix}_funded`;
        }

        // 4. One Step Mapping
        if (t.includes('1-step') || t.includes('1 step') || t.includes('1_step') || t.includes('instant')) {
            return `${prefix}_1_step`;
        }

        return t;
    }

    /**
     * Refresh the rules cache from DB
     */
    private static async refreshCache() {
        try {
            const { data, error } = await supabase
                .from('challenge_type_rules')
                .select('*');

            if (error) {
                console.error('Error fetching challenge type rules:', error);
                return;
            }

            this.RULES_CACHE.clear();
            (data || []).forEach(rule => {
                // Store by lowercase challenge_type
                const normalizedType = (rule.challenge_type || '').toLowerCase();
                this.RULES_CACHE.set(normalizedType, rule);
                // console.log(`[RulesService] Cached: '${normalizedType}' (Profit: ${rule.profit_target_percent}%, Daily DD: ${rule.daily_drawdown_percent}%, Max DD: ${rule.max_drawdown_percent}%)`);
            });
            this.lastCacheUpdate = Date.now();
            const DEBUG = process.env.DEBUG === 'true';
            if (DEBUG) console.log(`✅ RulesService: Cached ${this.RULES_CACHE.size} challenge type rule configurations.`);
        } catch (e) {
            console.error('RulesService cache refresh failed:', e);
        }
    }

    /**
     * Calculate absolute values for a specific account
     */
    static async calculateObjectives(challengeId: string) {
        // Fetch account details
        const { data: challenge, error } = await supabase
            .from('challenges')
            .select('initial_balance, group, challenge_type, current_equity, start_of_day_equity, status')
            .eq('id', challengeId)
            .single();

        if (error || !challenge) {
            throw new Error('Challenge not found');
        }

        // Get percentages
        const rules = await this.getRules(challenge.group, challenge.challenge_type);

        const initialBalance = Number(challenge.initial_balance) || 100000;

        // Calculate Limits
        const maxDailyLoss = initialBalance * (rules.max_daily_loss_percent / 100);
        const maxTotalLoss = initialBalance * (rules.max_total_loss_percent / 100);
        const profitTarget = initialBalance * (rules.profit_target_percent / 100);

        return {
            maxDailyLoss,
            maxTotalLoss,
            profitTarget,
            rules,
            challenge
        };
    }

    /**
     * Check Consistency Rule (Max Single Trade Win %)
     */
    static async checkConsistency(challengeId: string) {
        // 1. Fetch Challenge & Account Type/Group
        const { data: challenge } = await supabase
            .from('challenges')
            .select('id, group, challenge_type, account_type_id, account_types(mt5_group_name)')
            .eq('id', challengeId)
            .single();

        if (!challenge) return { enabled: false, passed: true, score: 0, maxAllowed: 0, details: 'Challenge not found' };

        // 2. Resolve MT5 Group
        const acType: any = challenge.account_types;
        let mt5Group = (Array.isArray(acType) ? acType[0]?.mt5_group_name : acType?.mt5_group_name) || challenge.group || '';

        // 3. Check if Rule Applies (Instant/Funded only usually)
        const typeStr = (challenge.challenge_type || '').toLowerCase();
        const isInstant = typeStr.includes('instant') || typeStr.includes('funded') || typeStr.includes('master');

        if (!isInstant) {
            return { enabled: false, passed: true, score: 0, maxAllowed: 0, details: 'Rule applies to Instant/Funded only' };
        }

        // 4. Fetch Config
        const { data: config } = await supabase
            .from('risk_rules_config')
            .select('max_single_win_percent, consistency_enabled')
            .eq('mt5_group_name', mt5Group)
            .maybeSingle();

        const enabled = config?.consistency_enabled !== false;

        const maxWinPercent = config?.max_single_win_percent || 50;

        if (!enabled) {
            return { enabled: false, passed: true, score: 0, maxAllowed: maxWinPercent, details: 'Rule disabled' };
        }

        // 5. Calculate Score
        const { data: trades } = await supabase
            .from('trades')
            .select('profit_loss, ticket, commission, swap')
            .eq('challenge_id', challengeId)
            .gt('profit_loss', 0)
            .gt('lots', 0); // Exclude deposits

        if (!trades || trades.length === 0) {
            return { enabled: true, passed: true, score: 0, maxAllowed: maxWinPercent, details: 'No winning trades' };
        }

        const totalProfit = trades.reduce((sum, t) => {
            const profit = Number(t.profit_loss) || 0;
            const comm = Number(t.commission) || 0;
            const swap = Number(t.swap) || 0;
            return sum + profit + comm + swap;
        }, 0);
        let highestWinPercent = 0;
        let violationTrade = null;

        if (totalProfit > 0) {
            for (const trade of trades) {
                const profit = Number(trade.profit_loss) || 0;
                const comm = Number(trade.commission) || 0;
                const swap = Number(trade.swap) || 0;
                const tradeNet = profit + comm + swap;
                const percent = (tradeNet / totalProfit) * 100;
                if (percent > highestWinPercent) {
                    highestWinPercent = percent;
                    if (percent > maxWinPercent) {
                        violationTrade = trade;
                    }
                }
            }
        }

        return {
            enabled: true,
            passed: highestWinPercent <= maxWinPercent,
            score: highestWinPercent,
            maxAllowed: maxWinPercent,
            violationTrade,
            details: violationTrade ? `Trade #${violationTrade.ticket} represents ${highestWinPercent.toFixed(1)}% of profit` : 'Passed'
        };
    }
}
