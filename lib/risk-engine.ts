/**
 * Professional Risk Engine for Prop Trading
 * 
 * Detects violations including:
 * - Max daily loss
 * - Max drawdown
 * - Trading hours
 * - Consistency rules
 * - Lot sizing
 * - News trading
 * - Weekend trading
 * - EA detection
 * - Revenge trading
 * - Tick scalping
 */

import { SupabaseClient } from '@supabase/supabase-js';

// ============================================
// TYPES & INTERFACES
// ============================================

export interface Trade {
    id?: string;
    challenge_id: string;
    user_id: string;
    ticket_number: string;
    symbol: string;
    type: 'buy' | 'sell';
    lots: number;
    open_price: number;
    close_price?: number;
    open_time: Date;
    close_time?: Date;
    profit_loss: number;
    commission?: number;
    swap?: number;
    magic_number?: number;
    comment?: string;
}

export interface RiskViolation {
    violation_type: string;
    severity: 'warning' | 'critical' | 'breach';
    description: string;
    trade_ticket?: string;
    symbol?: string;
    amount?: number;
    threshold?: number;
    percentage?: number;
    metadata?: Record<string, any>;
}

export interface ConsistencySnapshot {
    challenge_id: string;
    trade_id: string;
    trade_ticket: string;
    trade_profit: number;
    cumulative_profit: number;
    total_winning_trades: number;
    trade_percentage: number;
    is_violation: boolean;
    threshold_percent: number;
}

export interface DailyStats {
    challenge_id: string;
    trading_date: Date;
    starting_balance: number;
    starting_equity: number;
    total_trades: number;
    winning_trades: number;
    losing_trades: number;
    daily_pnl: number;
    largest_win: number;
    largest_loss: number;
    max_daily_loss_limit: number;
    max_drawdown_limit: number;
    is_breached: boolean;
}

export interface RiskRules {
    max_daily_loss_percent: number;
    max_total_drawdown_percent: number;
    max_lot_size?: number;
    max_risk_per_trade_percent?: number;
    consistency_enabled: boolean;
    max_single_win_percent: number;
    trading_hours_enabled: boolean;
    trading_start_time?: string;
    trading_end_time?: string;
    allow_weekend_trading: boolean;
    allow_news_trading: boolean;
    news_buffer_minutes: number;
    allow_ea_trading: boolean;
    min_trade_duration_seconds: number;
    max_trades_per_day?: number;
}

export interface RiskCheckResult {
    violations: RiskViolation[];
    is_breached: boolean;
    warnings: string[];
    metrics: {
        daily_pnl: number;
        daily_loss_percent: number;
        total_drawdown_percent: number;
        largest_trade_percent?: number;
    };
}

// ============================================
// RISK ENGINE CLASS
// ============================================

export class RiskEngine {
    private supabase: SupabaseClient;
    private cache: Map<string, any> = new Map();
    private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

    constructor(supabase: SupabaseClient) {
        this.supabase = supabase;
    }

    /**
     * Main entry point - check all risks for a trade
     * 
     * ALL RULES DISABLED FOR TESTING
     * Enable one by one as requested by user
     */
    async checkTrade(trade: Trade): Promise<RiskCheckResult> {
        const violations: RiskViolation[] = [];
        const warnings: string[] = [];

        try {
            // Get rules configuration
            const rules = await this.getRiskRules(trade.challenge_id);
            if (!rules) {
                throw new Error('Risk rules not found for challenge');
            }

            // Get current daily stats
            const dailyStats = await this.getDailyStats(trade.challenge_id);

            // Get all trades for the challenge today
            const todaysTrades = await this.getTodaysTrades(trade.challenge_id);

            // ============================================
            // ALL RULES DISABLED - ENABLE ONE BY ONE
            // ============================================

            // RULE 1: Max Daily Loss - ENABLED
            const dailyLossCheck = await this.checkDailyLoss(trade, dailyStats, rules);
            if (dailyLossCheck) violations.push(dailyLossCheck);

            // RULE 2: Max Drawdown - ENABLED
            const drawdownCheck = await this.checkMaxDrawdown(trade, dailyStats, rules);
            if (drawdownCheck) violations.push(drawdownCheck);

            // RULE 3: Trading Hours - DISABLED
            // const hoursCheck = await this.checkTradingHours(trade, rules);
            // if (hoursCheck) violations.push(hoursCheck);

            // RULE 4: Consistency - ENABLED
            const consistencyCheck = await this.checkConsistency(trade, todaysTrades, dailyStats, rules);
            if (consistencyCheck) violations.push(consistencyCheck);

            // RULE 5: Lot Size - DISABLED
            // const lotSizeCheck = await this.checkLotSize(trade, dailyStats, rules);
            // if (lotSizeCheck) violations.push(lotSizeCheck);

            // RULE 6: Weekend Trading - DISABLED
            // const weekendCheck = await this.checkWeekendTrading(trade, rules);
            // if (weekendCheck) violations.push(weekendCheck);

            // RULE 7: EA Detection - DISABLED
            // const eaCheck = await this.checkEADetection(trade, rules);
            // if (eaCheck) violations.push(eaCheck);

            // RULE 8: Revenge Trading - DISABLED
            // const revengeCheck = await this.checkRevengeTrading(trade, todaysTrades);
            // if (revengeCheck) violations.push(revengeCheck);

            // RULE 9: Tick Scalping - DISABLED
            // const scalpingCheck = await this.checkTickScalping(trade, rules);
            // if (scalpingCheck) violations.push(scalpingCheck);

            // ============================================

            // Collect warnings
            violations.forEach(v => {
                if (v.severity === 'warning') {
                    warnings.push(v.description);
                }
            });

            // Calculate metrics
            const newDailyPnl = (dailyStats?.daily_pnl || 0) + (trade.profit_loss || 0);
            const dailyLossPercent = Math.abs((newDailyPnl / dailyStats.starting_balance) * 100);
            const totalDrawdown = Math.abs(((dailyStats.starting_balance - (dailyStats.starting_balance + newDailyPnl)) / dailyStats.starting_balance) * 100);

            const isBreached = violations.some(v => v.severity === 'breach');

            return {
                violations,
                is_breached: isBreached,
                warnings,
                metrics: {
                    daily_pnl: newDailyPnl,
                    daily_loss_percent: dailyLossPercent,
                    total_drawdown_percent: totalDrawdown,
                }
            };

        } catch (error) {
            console.error('Risk check failed:', error);
            // Fail-safe: don't breach on system errors
            return {
                violations: [],
                is_breached: false,
                warnings: ['Risk check system error - manual review required'],
                metrics: { daily_pnl: 0, daily_loss_percent: 0, total_drawdown_percent: 0 }
            };
        }
    }

    // ============================================
    // INDIVIDUAL RULE CHECKS
    // ============================================

    /**
     * Rule 1: Max Daily Loss
     */
    private async checkDailyLoss(
        trade: Trade,
        dailyStats: DailyStats,
        rules: RiskRules
    ): Promise<RiskViolation | null> {
        const newDailyPnl = (dailyStats.daily_pnl || 0) + (trade.profit_loss || 0);
        const dailyLossAmount = Math.abs(Math.min(0, newDailyPnl));
        const maxLossAllowed = dailyStats.starting_balance * (rules.max_daily_loss_percent / 100);

        if (dailyLossAmount >= maxLossAllowed) {
            return {
                violation_type: 'daily_loss',
                severity: 'breach',
                description: `Daily loss limit breached: ${dailyLossAmount.toFixed(2)} >= ${maxLossAllowed.toFixed(2)}`,
                amount: dailyLossAmount,
                threshold: maxLossAllowed,
                percentage: (dailyLossAmount / dailyStats.starting_balance) * 100,
                trade_ticket: trade.ticket_number,
            };
        }

        // Warning at 80% of limit
        if (dailyLossAmount >= maxLossAllowed * 0.8) {
            return {
                violation_type: 'daily_loss',
                severity: 'warning',
                description: `Approaching daily loss limit: ${dailyLossAmount.toFixed(2)} (${((dailyLossAmount / maxLossAllowed) * 100).toFixed(1)}% of limit)`,
                amount: dailyLossAmount,
                threshold: maxLossAllowed,
            };
        }

        return null;
    }

    /**
     * Rule 2: Max Total Drawdown
     */
    private async checkMaxDrawdown(
        trade: Trade,
        dailyStats: DailyStats,
        rules: RiskRules
    ): Promise<RiskViolation | null> {
        const newBalance = dailyStats.starting_balance + (dailyStats.daily_pnl || 0) + (trade.profit_loss || 0);
        const drawdown = dailyStats.starting_balance - newBalance;
        const maxDrawdownAllowed = dailyStats.starting_balance * (rules.max_total_drawdown_percent / 100);

        if (drawdown >= maxDrawdownAllowed) {
            return {
                violation_type: 'max_drawdown',
                severity: 'breach',
                description: `Maximum drawdown breached: ${drawdown.toFixed(2)} >= ${maxDrawdownAllowed.toFixed(2)}`,
                amount: drawdown,
                threshold: maxDrawdownAllowed,
                percentage: (drawdown / dailyStats.starting_balance) * 100,
                trade_ticket: trade.ticket_number,
            };
        }

        return null;
    }

    /**
     * Rule 3: Trading Hours
     */
    private async checkTradingHours(
        trade: Trade,
        rules: RiskRules
    ): Promise<RiskViolation | null> {
        if (!rules.trading_hours_enabled || !rules.trading_start_time || !rules.trading_end_time) {
            return null;
        }

        const tradeTime = new Date(trade.open_time);
        const tradeHour = tradeTime.getUTCHours();
        const tradeMinute = tradeTime.getUTCMinutes();
        const tradeTimeInMinutes = tradeHour * 60 + tradeMinute;

        const [startHour, startMin] = rules.trading_start_time.split(':').map(Number);
        const [endHour, endMin] = rules.trading_end_time.split(':').map(Number);
        const startTimeInMinutes = startHour * 60 + startMin;
        const endTimeInMinutes = endHour * 60 + endMin;

        if (tradeTimeInMinutes < startTimeInMinutes || tradeTimeInMinutes > endTimeInMinutes) {
            return {
                violation_type: 'trading_hours',
                severity: 'critical',
                description: `Trade placed outside allowed trading hours (${rules.trading_start_time} - ${rules.trading_end_time} UTC)`,
                trade_ticket: trade.ticket_number,
                symbol: trade.symbol,
                metadata: { trade_time: tradeTime.toISOString() }
            };
        }

        return null;
    }

    /**
     * Rule 4: Consistency (Per-Trade Lifetime Tracking)
     * Each winning trade is checked against ALL historical winning trades
     * This is industry standard (FTMO, The5ers, etc.)
     */
    private async checkConsistency(
        trade: Trade,
        allTrades: Trade[], // Not used anymore, kept for compatibility
        dailyStats: DailyStats,
        rules: RiskRules
    ): Promise<RiskViolation | null> {
        if (!rules.consistency_enabled) return null;

        // Only check for closed winning trades
        if (!trade.close_time || (trade.profit_loss || 0) <= 0) return null;

        try {
            // Get cumulative profit from ALL historical winning trades
            const cumulativeData = await this.getCumulativeProfitData(trade.challenge_id);

            // Calculate percentage including this trade
            const newCumulativeProfit = cumulativeData.cumulative_profit + (trade.profit_loss || 0);

            if (newCumulativeProfit <= 0) return null;

            const tradePercentOfProfit = ((trade.profit_loss || 0) / newCumulativeProfit) * 100;

            // Store consistency snapshot for this trade
            await this.storeConsistencySnapshot({
                challenge_id: trade.challenge_id,
                trade_id: trade.id || '',
                trade_ticket: trade.ticket_number,
                trade_profit: trade.profit_loss || 0,
                cumulative_profit: newCumulativeProfit,
                total_winning_trades: cumulativeData.total_winning_trades + 1,
                trade_percentage: tradePercentOfProfit,
                is_violation: tradePercentOfProfit > rules.max_single_win_percent,
                threshold_percent: rules.max_single_win_percent,
            });

            // Check if this violates consistency rule
            if (tradePercentOfProfit > rules.max_single_win_percent) {
                return {
                    violation_type: 'consistency',
                    severity: 'breach',
                    description: `Consistency rule violated: Trade represents ${tradePercentOfProfit.toFixed(1)}% of lifetime profit (max: ${rules.max_single_win_percent}%)`,
                    trade_ticket: trade.ticket_number,
                    symbol: trade.symbol,
                    amount: trade.profit_loss,
                    percentage: tradePercentOfProfit,
                    threshold: rules.max_single_win_percent,
                    metadata: {
                        cumulative_profit: newCumulativeProfit,
                        total_winning_trades: cumulativeData.total_winning_trades + 1,
                    }
                };
            }

            return null;

        } catch (error) {
            console.error('Error checking consistency:', error);
            // Fail-safe: don't breach on errors
            return null;
        }
    }

    /**
     * Rule 5: Lot Sizing
     */
    private async checkLotSize(
        trade: Trade,
        dailyStats: DailyStats,
        rules: RiskRules
    ): Promise<RiskViolation | null> {
        if (rules.max_lot_size && trade.lots > rules.max_lot_size) {
            return {
                violation_type: 'lot_size',
                severity: 'critical',
                description: `Excessive lot size: ${trade.lots} lots exceeds maximum ${rules.max_lot_size}`,
                trade_ticket: trade.ticket_number,
                symbol: trade.symbol,
                amount: trade.lots,
                threshold: rules.max_lot_size
            };
        }

        return null;
    }

    /**
     * Rule 6: Weekend Trading
     */
    private async checkWeekendTrading(
        trade: Trade,
        rules: RiskRules
    ): Promise<RiskViolation | null> {
        if (rules.allow_weekend_trading) return null;

        const tradeDate = new Date(trade.open_time);
        const dayOfWeek = tradeDate.getUTCDay();

        // 0 = Sunday, 6 = Saturday
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            return {
                violation_type: 'weekend_trading',
                severity: 'critical',
                description: `Weekend trading detected on ${dayOfWeek === 0 ? 'Sunday' : 'Saturday'}`,
                trade_ticket: trade.ticket_number,
                symbol: trade.symbol,
                metadata: { day_of_week: dayOfWeek }
            };
        }

        return null;
    }

    /**
     * Rule 7: EA Detection
     */
    private async checkEADetection(
        trade: Trade,
        rules: RiskRules
    ): Promise<RiskViolation | null> {
        if (rules.allow_ea_trading) return null;

        // Check for magic number (EA indicator)
        if (trade.magic_number && trade.magic_number !== 0) {
            return {
                violation_type: 'ea_detected',
                severity: 'breach',
                description: `Expert Advisor detected (Magic Number: ${trade.magic_number})`,
                trade_ticket: trade.ticket_number,
                symbol: trade.symbol,
                metadata: { magic_number: trade.magic_number }
            };
        }

        // Check for common EA comment patterns
        const eaKeywords = ['EA', 'Expert', 'Robot', 'Bot', 'Auto'];
        if (trade.comment) {
            for (const keyword of eaKeywords) {
                if (trade.comment.toLowerCase().includes(keyword.toLowerCase())) {
                    return {
                        violation_type: 'ea_detected',
                        severity: 'warning',
                        description: `Possible EA usage detected in trade comment: "${trade.comment}"`,
                        trade_ticket: trade.ticket_number,
                        metadata: { comment: trade.comment }
                    };
                }
            }
        }

        return null;
    }

    /**
     * Rule 8: Revenge Trading Pattern
     * Detect rapid trading with increased lots after a loss
     */
    private async checkRevengeTrading(
        trade: Trade,
        recentTrades: Trade[]
    ): Promise<RiskViolation | null> {
        if (recentTrades.length === 0) return null;

        // Get last closed trade
        const lastTrade = recentTrades
            .filter(t => t.close_time)
            .sort((a, b) => new Date(b.close_time!).getTime() - new Date(a.close_time!).getTime())[0];

        if (!lastTrade) return null;

        // Check if last trade was a loss
        if ((lastTrade.profit_loss || 0) >= 0) return null;

        // Check if current trade was opened quickly after the loss
        const timeSinceLastTrade = new Date(trade.open_time).getTime() - new Date(lastTrade.close_time!).getTime();
        const fiveMinutes = 5 * 60 * 1000; // 5 minutes in ms

        if (timeSinceLastTrade < fiveMinutes && trade.lots > lastTrade.lots) {
            return {
                violation_type: 'revenge_trading',
                severity: 'warning',
                description: `Possible revenge trading: Increased lot size (${lastTrade.lots} → ${trade.lots}) within ${Math.round(timeSinceLastTrade / 1000)}s of a loss`,
                trade_ticket: trade.ticket_number,
                symbol: trade.symbol,
                metadata: {
                    previous_loss: lastTrade.profit_loss,
                    time_difference_seconds: Math.round(timeSinceLastTrade / 1000),
                    lot_increase: trade.lots - lastTrade.lots
                }
            };
        }

        return null;
    }

    /**
     * Rule 9: Tick Scalping
     */
    private async checkTickScalping(
        trade: Trade,
        rules: RiskRules
    ): Promise<RiskViolation | null> {
        // Only check closed trades
        if (!trade.close_time) return null;

        const durationMs = new Date(trade.close_time).getTime() - new Date(trade.open_time).getTime();
        const durationSeconds = Math.round(durationMs / 1000);

        if (durationSeconds < rules.min_trade_duration_seconds) {
            return {
                violation_type: 'tick_scalping',
                severity: 'warning',
                description: `Very short trade duration: ${durationSeconds}s (minimum: ${rules.min_trade_duration_seconds}s)`,
                trade_ticket: trade.ticket_number,
                symbol: trade.symbol,
                metadata: { duration_seconds: durationSeconds }
            };
        }

        return null;
    }

    // ============================================
    // HELPER METHODS
    // ============================================

    private async getRiskRules(challengeId: string): Promise<RiskRules | null> {
        // Try cache first
        const cacheKey = `rules_${challengeId}`;
        const cached = this.getFromCache<RiskRules>(cacheKey);
        if (cached) return cached;

        try {
            // Fetch from database (risk_rules_config table)
            const { data, error } = await this.supabase
                .from('risk_rules_config')
                .select('*')
                .eq('is_active', true)
                .limit(1)
                .single();

            if (error || !data) {
                // Return default rules if not found
                console.warn('Using default risk rules');
                return this.getDefaultRiskRules();
            }

            const rules: RiskRules = {
                max_daily_loss_percent: data.max_daily_loss_percent,
                max_total_drawdown_percent: data.max_total_drawdown_percent,
                consistency_enabled: data.consistency_enabled,
                max_single_win_percent: data.max_single_win_percent,
                trading_hours_enabled: data.trading_hours_enabled,
                trading_start_time: data.trading_start_time,
                trading_end_time: data.trading_end_time,
                allow_weekend_trading: data.allow_weekend_trading,
                allow_news_trading: data.allow_news_trading,
                news_buffer_minutes: data.news_buffer_minutes,
                allow_ea_trading: data.allow_ea_trading,
                min_trade_duration_seconds: data.min_trade_duration_seconds,
                max_lot_size: data.max_lot_size,
                max_risk_per_trade_percent: data.max_risk_per_trade_percent,
                max_trades_per_day: data.max_trades_per_day,
            };

            // Cache for 1 hour
            this.setCache(cacheKey, rules, 60 * 60 * 1000);
            return rules;

        } catch (error) {
            console.error('Error fetching risk rules:', error);
            return this.getDefaultRiskRules();
        }
    }

    private getDefaultRiskRules(): RiskRules {
        return {
            max_daily_loss_percent: 5.0,
            max_total_drawdown_percent: 10.0,
            consistency_enabled: true,
            max_single_win_percent: 50.0,
            trading_hours_enabled: false,
            allow_weekend_trading: false,
            allow_news_trading: true,
            news_buffer_minutes: 5,
            allow_ea_trading: true,
            min_trade_duration_seconds: 180,
        };
    }

    private async getDailyStats(challengeId: string): Promise<DailyStats> {
        // Try cache first (5 min TTL)
        const cacheKey = `daily_stats_${challengeId}_${new Date().toISOString().split('T')[0]}`;
        const cached = this.getFromCache<DailyStats>(cacheKey);
        if (cached) return cached;

        try {
            const { data, error } = await this.supabase
                .from('daily_stats')
                .select('*')
                .eq('challenge_id', challengeId)
                .eq('trading_date', new Date().toISOString().split('T')[0])
                .single();

            if (error || !data) {
                // Create default stats if not found
                const defaultStats: DailyStats = {
                    challenge_id: challengeId,
                    trading_date: new Date(),
                    starting_balance: 100000,
                    starting_equity: 100000,
                    total_trades: 0,
                    winning_trades: 0,
                    losing_trades: 0,
                    daily_pnl: 0,
                    largest_win: 0,
                    largest_loss: 0,
                    max_daily_loss_limit: 5000,
                    max_drawdown_limit: 10000,
                    is_breached: false
                };
                return defaultStats;
            }

            const stats = data as DailyStats;
            this.setCache(cacheKey, stats);
            return stats;

        } catch (error) {
            console.error('Error fetching daily stats:', error);
            throw error;
        }
    }

    private async getTodaysTrades(challengeId: string): Promise<Trade[]> {
        const today = new Date().toISOString().split('T')[0];

        const { data, error } = await this.supabase
            .from('trades')
            .select('*')
            .eq('challenge_id', challengeId)
            .gte('open_time', today);

        if (error || !data) return [];
        return data as Trade[];
    }

    /**
     * Log violation to database
     */
    async logViolation(challengeId: string, userId: string, violation: RiskViolation): Promise<void> {
        try {
            await this.supabase.from('risk_violations').insert({
                challenge_id: challengeId,
                user_id: userId,
                ...violation
            });
        } catch (error) {
            console.error('Error logging violation:', error);
            // Don't throw - logging failures shouldn't break risk checks
        }
    }

    // ============================================
    // NEW HELPER METHODS FOR CONSISTENCY TRACKING
    // ============================================

    /**
     * Get cumulative profit data from all historical winning trades
     */
    private async getCumulativeProfitData(challengeId: string): Promise<{
        cumulative_profit: number;
        total_winning_trades: number;
        largest_win: number;
    }> {
        // Try cache first (30 second TTL for consistency data)
        const cacheKey = `cumulative_${challengeId}`;
        const cached = this.getFromCache<any>(cacheKey);
        if (cached) return cached;

        try {
            // Use the database function for accurate calculation
            const { data, error } = await this.supabase
                .rpc('get_cumulative_profit', { p_challenge_id: challengeId });

            if (error) throw error;

            const result = {
                cumulative_profit: data[0]?.cumulative_profit || 0,
                total_winning_trades: data[0]?.total_winning_trades || 0,
                largest_win: data[0]?.largest_win || 0,
            };

            // Cache for 30 seconds
            this.setCache(cacheKey, result, 30 * 1000);
            return result;

        } catch (error) {
            console.error('Error getting cumulative profit:', error);
            return { cumulative_profit: 0, total_winning_trades: 0, largest_win: 0 };
        }
    }

    /**
     * Store consistency snapshot in database
     */
    private async storeConsistencySnapshot(snapshot: ConsistencySnapshot): Promise<void> {
        try {
            await this.supabase
                .from('trade_consistency_snapshot')
                .insert(snapshot);

            // Invalidate cache
            this.cache.delete(`cumulative_${snapshot.challenge_id}`);
        } catch (error) {
            console.error('Error storing consistency snapshot:', error);
            // Don't throw - snapshot storage failures shouldn't break risk checks
        }
    }

    /**
     * Check trade with retry logic for crash prevention
     */
    async checkTradeWithRetry(trade: Trade, maxRetries = 3): Promise<RiskCheckResult> {
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await this.checkTrade(trade);
            } catch (error) {
                lastError = error as Error;
                console.error(`Risk check failed (attempt ${attempt}/${maxRetries}):`, error);

                if (attempt < maxRetries) {
                    // Exponential backoff
                    const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                }
            }
        }

        // All retries failed - return safe default
        console.error('All risk check retries failed:', lastError);
        return {
            violations: [],
            is_breached: false,
            warnings: ['Risk check failed - manual review required'],
            metrics: { daily_pnl: 0, daily_loss_percent: 0, total_drawdown_percent: 0 }
        };
    }

    // ============================================
    // CACHE MANAGEMENT
    // ============================================

    private getFromCache<T>(key: string): T | null {
        const cached = this.cache.get(key);
        if (!cached) return null;

        // Check if expired
        if (Date.now() > cached.expiresAt) {
            this.cache.delete(key);
            return null;
        }

        return cached.value as T;
    }

    private setCache<T>(key: string, value: T, ttlMs: number = this.CACHE_TTL_MS): void {
        this.cache.set(key, {
            value,
            expiresAt: Date.now() + ttlMs,
        });
    }

    /**
     * Clear all caches
     */
    clearCache(): void {
        this.cache.clear();
    }
}
