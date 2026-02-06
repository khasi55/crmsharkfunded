/**
 * Risk Rules Configuration Based on Challenge Type
 * This defines the specific risk parameters for each challenge type
 */

export interface RiskRules {
    challenge_type: string;
    profit_target_percent: number;  // 0 means no target (for funded)
    daily_drawdown_percent: number;
    max_drawdown_percent: number;
}

export const RISK_RULES: Record<string, RiskRules> = {
    // ========== LITE ACCOUNTS ==========
    'lite_instant': {
        challenge_type: 'lite_instant',
        profit_target_percent: 0, // No target for instant
        daily_drawdown_percent: 3,
        max_drawdown_percent: 6,
    },
    'lite_1_step': {
        challenge_type: 'lite_1_step',
        profit_target_percent: 9,
        daily_drawdown_percent: 3,
        max_drawdown_percent: 6,
    },
    'lite_2_step_phase_1': {
        challenge_type: 'lite_2_step_phase_1',
        profit_target_percent: 9,
        daily_drawdown_percent: 3,
        max_drawdown_percent: 6,
    },
    'lite_2_step_phase_2': {
        challenge_type: 'lite_2_step_phase_2',
        profit_target_percent: 6,
        daily_drawdown_percent: 3,
        max_drawdown_percent: 6,
    },
    'lite_funded': {
        challenge_type: 'lite_funded',
        profit_target_percent: 0, // No target for funded
        daily_drawdown_percent: 3,
        max_drawdown_percent: 6,
    },

    // ========== PRIME ACCOUNTS ==========
    'prime_instant': {
        challenge_type: 'prime_instant',
        profit_target_percent: 0, // No target for instant
        daily_drawdown_percent: 4,
        max_drawdown_percent: 7,
    },
    'prime_1_step': {
        challenge_type: 'prime_1_step',
        profit_target_percent: 9,
        daily_drawdown_percent: 4,
        max_drawdown_percent: 10,
    },
    'prime_2_step_phase_1': {
        challenge_type: 'prime_2_step_phase_1',
        profit_target_percent: 9,
        daily_drawdown_percent: 4,
        max_drawdown_percent: 10,
    },
    'prime_2_step_phase_2': {
        challenge_type: 'prime_2_step_phase_2',
        profit_target_percent: 6,
        daily_drawdown_percent: 4,
        max_drawdown_percent: 10,
    },
    'prime_funded': {
        challenge_type: 'prime_funded',
        profit_target_percent: 0, // No target for funded
        daily_drawdown_percent: 4,
        max_drawdown_percent: 7, // Stricter for funded
    },
};

/**
 * Get risk rules for a specific challenge type
 */
export function getRiskRules(challengeType: string): RiskRules | null {
    const normalizedType = challengeType?.toLowerCase() || '';

    // Direct match
    if (RISK_RULES[normalizedType]) {
        return RISK_RULES[normalizedType];
    }

    // Fallback for old challenge types
    if (normalizedType.includes('instant')) {
        return normalizedType.includes('lite') ? RISK_RULES['lite_instant'] : RISK_RULES['prime_instant'];
    }
    if (normalizedType.includes('1_step') || normalizedType.includes('evaluation')) {
        return normalizedType.includes('lite') ? RISK_RULES['lite_1_step'] : RISK_RULES['prime_1_step'];
    }
    if (normalizedType.includes('phase_1') || normalizedType === 'phase 1') {
        return normalizedType.includes('lite') ? RISK_RULES['lite_2_step_phase_1'] : RISK_RULES['prime_2_step_phase_1'];
    }
    if (normalizedType.includes('phase_2') || normalizedType === 'phase 2') {
        return normalizedType.includes('lite') ? RISK_RULES['lite_2_step_phase_2'] : RISK_RULES['prime_2_step_phase_2'];
    }
    if (normalizedType.includes('funded')) {
        return normalizedType.includes('lite') ? RISK_RULES['lite_funded'] : RISK_RULES['prime_funded'];
    }

    console.warn(`⚠️ No risk rules found for challenge type: ${challengeType}`);
    return null;
}

/**
 * Check if account has reached profit target
 */
export function hasProfitTarget(challengeType: string, initialBalance: number, currentEquity: number): boolean {
    const rules = getRiskRules(challengeType);
    if (!rules || rules.profit_target_percent === 0) {
        return false; // No target or instant/funded account
    }

    const profitTarget = initialBalance * (rules.profit_target_percent / 100);
    const currentProfit = currentEquity - initialBalance;

    return currentProfit >= profitTarget;
}

/**
 * Calculate profit target amount
 */
export function getProfitTargetAmount(challengeType: string, initialBalance: number): number {
    const rules = getRiskRules(challengeType);
    if (!rules || rules.profit_target_percent === 0) {
        return 0;
    }

    return initialBalance * (rules.profit_target_percent / 100);
}
