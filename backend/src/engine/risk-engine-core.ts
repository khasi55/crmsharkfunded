
import { SupabaseClient } from '@supabase/supabase-js';
import { EmailService } from '../services/email-service';

// ============================================
// TYPES (Mirrored from original engine)
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
    // Assuming metadata might hold SL/TP if not in main columns
    metadata?: {
        stop_loss?: number;
    }
}

export interface RiskViolation {
    violation_type: string;
    severity: 'warning' | 'critical' | 'breach' | 'monitor';
    description: string;
    trade_ticket?: string;
    symbol?: string;
    amount?: number;
    threshold?: number;
    percentage?: number;
    metadata?: Record<string, any>;
}

export interface DailyStats {
    challenge_id: string;
    trading_date: Date;
    starting_balance: number;
    starting_equity: number;
    daily_pnl: number;
    max_daily_loss_limit: number;
    max_drawdown_limit: number;
}

export interface CoreRiskRules {
    max_daily_loss_percent: number;
    max_total_drawdown_percent: number;
    max_risk_per_trade_percent?: number; // 1% Rule
}

export interface CoreRiskResult {
    violations: RiskViolation[];
    is_breached: boolean;
    metrics: {
        daily_loss_percent: number;
        total_drawdown_percent: number;
        current_daily_loss: number;
        current_drawdown: number;
    };
}

// ============================================
// CORE RISK ENGINE
// ============================================

export class CoreRiskEngine {
    private supabase: SupabaseClient;

    constructor(supabase: SupabaseClient) {
        this.supabase = supabase;
    }

    /**
     * Log Core Violation to Database
     */
    async logViolation(challengeId: string, userId: string, violation: RiskViolation): Promise<void> {
        try {
            // 1. Log to DB
            await this.supabase.from('core_risk_violations').insert({
                challenge_id: challengeId,
                user_id: userId,
                violation_type: violation.violation_type,
                severity: 'breach', // Always breach for core
                description: violation.description,
                amount: violation.amount,
                threshold: violation.threshold,
                trade_ticket: violation.trade_ticket,
                metadata: violation.metadata
            });

            // 2. Send Email Notification
            // Fetch Account Login
            const { data: challenge } = await this.supabase
                .from('challenges')
                .select('login')
                .eq('id', challengeId)
                .single();

            // Fetch User Profile
            const { data: profile } = await this.supabase
                .from('profiles')
                .select('email, full_name')
                .eq('id', userId)
                .single();

            if (challenge && profile && profile.email) {
                console.log(`📧 Sending breach notification to ${profile.email} for account ${challenge.login}`);
                await EmailService.sendBreachNotification(
                    profile.email,
                    profile.full_name || 'Trader',
                    String(challenge.login),
                    violation.violation_type,
                    violation.description
                );
            }

        } catch (error) {
            console.error('Failed to log core violation or send email:', error);
        }
    }

    /**
     * Main validation for Core Financial Rules
     */
    async checkRisk(trade: Trade, rules: CoreRiskRules, dailyStats: DailyStats): Promise<CoreRiskResult> {
        const violations: RiskViolation[] = [];

        // 1. Max Daily Loss
        const dailyLossCheck = this.checkDailyLoss(trade, dailyStats, rules);
        if (dailyLossCheck) violations.push(dailyLossCheck);

        // 2. Max Total Drawdown
        const drawdownCheck = this.checkMaxDrawdown(trade, dailyStats, rules);
        if (drawdownCheck) violations.push(drawdownCheck);

        // 3. Max Risk Per Trade (1% Rule)
        if (rules.max_risk_per_trade_percent) {
            const riskCheck = this.checkRiskPerTrade(trade, dailyStats, rules.max_risk_per_trade_percent);
            if (riskCheck) violations.push(riskCheck);
        }

        const newDailyPnl = (dailyStats.daily_pnl || 0) + (trade.profit_loss || 0);
        const dailyLossAmount = Math.abs(Math.min(0, newDailyPnl));
        const totalDrawdown = dailyStats.starting_balance - (dailyStats.starting_balance + newDailyPnl);

        return {
            violations,
            is_breached: violations.some(v => v.severity === 'breach'),
            metrics: {
                daily_loss_percent: (dailyLossAmount / dailyStats.starting_balance) * 100,
                total_drawdown_percent: (totalDrawdown / dailyStats.starting_balance) * 100,
                current_daily_loss: dailyLossAmount,
                current_drawdown: totalDrawdown
            }
        };
    }

    // Rule 1: Max Daily Loss
    private checkDailyLoss(trade: Trade, stats: DailyStats, rules: CoreRiskRules): RiskViolation | null {
        // Calculate new daily PnL including this trade
        const newDailyPnl = (stats.daily_pnl || 0) + (trade.profit_loss || 0);

        // If positive PnL, no loss
        if (newDailyPnl >= 0) return null;

        const dailyLoss = Math.abs(newDailyPnl);
        const maxLoss = stats.starting_balance * (rules.max_daily_loss_percent / 100);

        if (dailyLoss >= maxLoss) {
            return {
                violation_type: 'daily_loss',
                severity: 'breach',
                description: `Daily loss limit breached: $${dailyLoss.toFixed(2)} >= $${maxLoss.toFixed(2)}`,
                amount: dailyLoss,
                threshold: maxLoss,
                trade_ticket: trade.ticket_number
            };
        }
        return null;
    }

    // Rule 2: Max Total Drawdown
    private checkMaxDrawdown(trade: Trade, stats: DailyStats, rules: CoreRiskRules): RiskViolation | null {
        // Current Balance + Profit = Current Equity (Roughly)
        // Drawdown is from Starting Balance (High Water Mark logic depends on specific prop firm rules, usually absolute or relative)
        // Assuming Absolute Drawdown from Initial Balance for simplicity unless Trailing specified

        const currentEquity = stats.starting_balance + (stats.daily_pnl || 0) + (trade.profit_loss || 0);
        const drawdown = stats.starting_balance - currentEquity;
        const maxDrawdown = stats.starting_balance * (rules.max_total_drawdown_percent / 100);

        if (drawdown >= maxDrawdown) {
            return {
                violation_type: 'max_drawdown',
                severity: 'breach',
                description: `Max drawdown breached: $${drawdown.toFixed(2)} >= $${maxDrawdown.toFixed(2)}`,
                amount: drawdown,
                threshold: maxDrawdown,
                trade_ticket: trade.ticket_number
            };
        }
        return null;
    }

    // Rule 3: Max Risk Per Trade (1%)
    private checkRiskPerTrade(trade: Trade, stats: DailyStats, maxPercent: number): RiskViolation | null {
        // Calculation requires Stop Loss. If unavailable, we can't accurately calculate risk %.
        // Fallback: Check if realized loss exceeds 1% (Post-trade check)

        if (trade.profit_loss < 0) {
            const lossAmount = Math.abs(trade.profit_loss);
            const riskLimit = stats.starting_balance * (maxPercent / 100);

            if (lossAmount > riskLimit) {
                return {
                    violation_type: 'max_risk_per_trade',
                    severity: 'breach',
                    description: `Risk per trade limit exceeded: Loss $${lossAmount.toFixed(2)} > $${riskLimit.toFixed(2)} (${maxPercent}%)`,
                    amount: lossAmount,
                    threshold: riskLimit,
                    trade_ticket: trade.ticket_number
                };
            }
        }
        return null;
    }
}
