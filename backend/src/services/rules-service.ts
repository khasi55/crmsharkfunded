
import { supabase } from '../lib/supabase';

export interface RiskProfile {
    max_daily_loss_percent: number;
    max_total_loss_percent: number;
    profit_target_percent: number;
    challenge_type: string;
}

export class RulesService {
    private static GROUP_CACHE: Map<string, any> = new Map();
    private static CACHE_TTL = 300000; // 5 minutes
    private static lastCacheUpdate = 0;

    /**
     * Get risk rules for a specific group and challenge type
     */
    static async getRules(groupName: string, challengeType: string = 'Phase 1'): Promise<RiskProfile> {
        // Refresh cache if needed
        if (Date.now() - this.lastCacheUpdate > this.CACHE_TTL || this.GROUP_CACHE.size === 0) {
            await this.refreshCache();
        }

        // Normalize group name
        const normalizedGroup = (groupName || '').replace(/\\\\/g, '\\').toLowerCase();

        let dbRule = this.GROUP_CACHE.get(normalizedGroup);

        // Fallback to searching without special characters if exact match failed
        if (!dbRule) {
            for (const [key, value] of this.GROUP_CACHE.entries()) {
                if (normalizedGroup.includes(key) || key.includes(normalizedGroup)) {
                    dbRule = value;
                    break;
                }
            }
        }

        // Defaults
        let maxDailyLossPercent = 5;
        let maxTotalLossPercent = 10;

        if (dbRule) {
            maxDailyLossPercent = (dbRule.daily_drawdown_percent !== undefined && dbRule.daily_drawdown_percent !== null)
                ? Number(dbRule.daily_drawdown_percent)
                : 5;

            maxTotalLossPercent = (dbRule.max_drawdown_percent !== undefined && dbRule.max_drawdown_percent !== null)
                ? Number(dbRule.max_drawdown_percent)
                : 10;
        }

        // Determine Profit Target based on Challenge Type / Group Name
        // Logic: Phase 1 = varies by group, Phase 2 = varies by group, Funded/Instant = 0%
        let profitTargetPercent = 8;

        const typeStr = (challengeType || '').toLowerCase();
        const groupStr = normalizedGroup;

        // CRITICAL FIX: Instant/Funded/Competition accounts should NEVER have a profit target for "passing".
        if (typeStr.includes('funded') || typeStr.includes('master') || typeStr.includes('instant') || typeStr.includes('competition') ||
            groupStr.includes('funded') || groupStr.includes('master') || groupStr.includes('instant') || groupStr.includes('competition')) {
            profitTargetPercent = 0;
        }
        // Handle Phase 2 for 2-step challenges with specific targets
        else if (typeStr.includes('phase 2') || typeStr.includes('step 2')) {
            // For 2-step Standard (demo\S\2-SF): Phase 2 = 6%
            if (groupStr.includes('demo\\s\\2') || groupStr.includes('2-sf')) {
                profitTargetPercent = 6;
            }
            // For 2-step Pro (demo\SF\2-Pro): Phase 2 = 6%
            else if (groupStr.includes('demo\\sf\\2') || groupStr.includes('2-pro')) {
                profitTargetPercent = 6;
            }
            else {
                profitTargetPercent = 5; // Default Phase 2
            }
        }
        // Handle Phase 1 and other challenges - use DB value
        else if (dbRule && dbRule.profit_target_percent !== undefined && dbRule.profit_target_percent !== null) {
            profitTargetPercent = Number(dbRule.profit_target_percent);
        }
        // Fallback defaults based on challenge type
        else if (typeStr.includes('phase 1') || typeStr.includes('step 1')) {
            profitTargetPercent = 8;
        }

        // --- FUNDED ACCOUNT OVERRIDE REMOVED ---
        // We now rely purely on the DB configuration (dbRule) or the defaults (5/10) set above.
        // If the user wants specific rules for Funded accounts, they must configure the risk group in Admin.

        console.log(`[RulesService] Resolved Rules for '${normalizedGroup}': Max=${maxTotalLossPercent}%, Daily=${maxDailyLossPercent}%, Profit=${profitTargetPercent}% (Source: ${dbRule ? 'DB' : 'DEFAULTS'})`);

        return {
            max_daily_loss_percent: maxDailyLossPercent,
            max_total_loss_percent: maxTotalLossPercent,
            profit_target_percent: profitTargetPercent,
            challenge_type: challengeType
        };
    }

    /**
     * Refresh the rules cache from DB
     */
    private static async refreshCache() {
        try {
            const { data, error } = await supabase
                .from('mt5_risk_groups')
                .select('*');

            if (error) {
                console.error('Error fetching risk groups:', error);
                return;
            }

            this.GROUP_CACHE.clear();
            (data || []).forEach(group => {
                const key = (group.group_name || '').replace(/\\\\/g, '\\').toLowerCase();
                this.GROUP_CACHE.set(key, group);
            });
            this.lastCacheUpdate = Date.now();
            console.log(` RulesService: Cached ${this.GROUP_CACHE.size} risk groups.`);
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
}
