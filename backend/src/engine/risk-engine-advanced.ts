
import { SupabaseClient } from '@supabase/supabase-js';
import { Trade, RiskViolation } from './risk-engine-core'; // Share types

export interface AdvancedRiskRules {
    max_lot_size?: number;
    allow_weekend_trading: boolean;
    allow_news_trading: boolean;
    allow_ea_trading: boolean;
    min_trade_duration_seconds: number;
    max_trades_per_day?: number;
    max_single_win_percent: number; // Consistency
    // Extended Rules
    allow_hedging?: boolean;
    allow_martingale?: boolean;
}

export class AdvancedRiskEngine {
    private supabase: SupabaseClient;

    constructor(supabase: SupabaseClient) {
        this.supabase = supabase;
    }

    /**
     * Log Advanced Risk Flag to Database
     */
    async logFlag(challengeId: string, userId: string, violation: RiskViolation): Promise<void> {
        try {
            // Deduplication: Check if this specific violation was already logged for this trade
            const { data: existing } = await this.supabase
                .from('advanced_risk_flags')
                .select('id')
                .eq('challenge_id', challengeId)
                .eq('trade_ticket', violation.trade_ticket)
                .eq('flag_type', violation.violation_type)
                .maybeSingle();

            if (existing) {
                // console.log(`ℹ️ Skipping duplicate risk flag: ${violation.violation_type} for ${violation.trade_ticket}`);
                return;
            }

            await this.supabase.from('advanced_risk_flags').insert({
                challenge_id: challengeId,
                user_id: userId,
                flag_type: violation.violation_type,
                severity: violation.severity || 'warning',
                description: violation.description,
                trade_ticket: violation.trade_ticket,
                symbol: violation.symbol,
                analysis_data: violation.metadata
            });
        } catch (error) {
            console.error('Failed to log risk flag:', error);
        }
    }

    /**
     * Run all advanced behavioral checks
     */
    async checkBehavioralRisk(
        trade: Trade,
        rules: AdvancedRiskRules,
        todaysTrades: Trade[],
        openTrades: Trade[]
    ): Promise<RiskViolation[]> {
        const violations: RiskViolation[] = [];

        // 1. Martingale (Revenge Trading)
        // Check ONLY if Martingale is BANNED (allow_martingale = false)
        if (rules.allow_martingale === false) {
            const martingale = await this.checkMartingale(trade, todaysTrades);
            if (martingale) violations.push(martingale);
        }

        // 2. Hedging
        // Check ONLY if Hedging is BANNED (allow_hedging = false)
        if (rules.allow_hedging === false) {
            const hedging = await this.checkHedging(trade, openTrades);
            if (hedging) violations.push(hedging);
        }

        // 3. Arbitrage (Latency/HFT)
        const arbitrage = await this.checkLatencyArbitrage(trade, todaysTrades);
        if (arbitrage) violations.push(arbitrage);

        // 4. Triangular Arbitrage
        const triArbitrage = await this.checkTriangularArbitrage(trade, openTrades);
        if (triArbitrage) violations.push(triArbitrage);

        // 5. Tick Scalping
        if (rules.min_trade_duration_seconds > 0) {
            const scalping = this.checkTickScalping(trade, rules.min_trade_duration_seconds);
            if (scalping) violations.push(scalping);
        }

        return violations;
    }

    // Rule: Martingale / Revenge Trading
    public checkMartingale(trade: Trade, recentTrades: Trade[]): RiskViolation | null {
        if (recentTrades.length === 0) return null;
        console.log(`🔍 Checking Martingale for Ticket #${trade.ticket_number} (Recent Trades: ${recentTrades.length})`);

        // Find last closed trade
        const lastTrade = recentTrades.filter(t => t.close_time)
            .sort((a, b) => new Date(b.close_time!).getTime() - new Date(a.close_time!).getTime())[0];

        if (!lastTrade || (lastTrade.profit_loss || 0) >= 0) return null;

        // Check if trade opened quickly after loss with larger size
        const timeDiff = new Date(trade.open_time).getTime() - new Date(lastTrade.close_time!).getTime();
        if (timeDiff < 5 * 60 * 1000 && trade.lots > lastTrade.lots) {
            // Convert lots to standard format (assuming stored as micro lots * 100)
            const lastLots = lastTrade.lots >= 100 ? (lastTrade.lots / 100).toFixed(2) : lastTrade.lots;
            const currentLots = trade.lots >= 100 ? (trade.lots / 100).toFixed(2) : trade.lots;

            return {
                violation_type: 'martingale',
                severity: 'warning', // Usually warning first
                description: `Martingale Detected: Increased lots (${lastLots} -> ${currentLots}) after loss.`,
                trade_ticket: trade.ticket_number
            };
        }
        return null;
    }

    // Rule: Hedging
    private checkHedging(trade: Trade, openTrades: Trade[]): RiskViolation | null {
        // Robust Hedging Check:
        // 1. Must be same symbol
        // 2. Must be opposite type
        // 3. Must ACTUALY OVERLAP in time (taking into account close times)
        // 4. Ignore tiny overlaps (< 2 seconds) to allow for latency/slippage during close/open switches

        const tradeOpen = new Date(trade.open_time).getTime();

        const opposing = openTrades.find(t => {
            if (t.symbol !== trade.symbol) return false;
            if (t.type === trade.type) return false;

            // Check Time Overlap
            // Existing Trade Open
            const tOpen = new Date(t.open_time).getTime();
            // Existing Trade Close (or Future if still open)
            const tClose = t.close_time ? new Date(t.close_time).getTime() : Date.now() + 31536000000;

            // Allow 2-second buffer for latency (e.g. closing one and opening another immediately)
            const overlapStart = Math.max(tradeOpen, tOpen);
            const overlapEnd = Math.min(Date.now(), tClose); // Assumes 'trade' is currently open/just opened
            const overlapDuration = overlapEnd - overlapStart;

            // If overlap is negative or very small (< 2000ms), ignore it
            if (overlapDuration < 2000) return false;

            return true;
        });

        if (opposing) {
            return {
                violation_type: 'hedging',
                severity: 'breach',
                description: `Hedging Detected: Opposing trade on ${trade.symbol} (Ticket #${opposing.ticket_number})`,
                trade_ticket: trade.ticket_number
            };
        }
        return null;
    }

    // Rule: Latency Arbitrage (HFT)
    private checkLatencyArbitrage(trade: Trade, recentTrades: Trade[]): RiskViolation | null {
        // ... (Logic from previous plan: 3 trades in 1 second)
        // Stub implementation
        return null;
    }

    // Rule: Triangular Arbitrage
    private checkTriangularArbitrage(trade: Trade, openTrades: Trade[]): RiskViolation | null {
        // Logic: Check if Open Trades + New Trade form a currency loop (A->B, B->C, C->A)
        // ... Stub implementation
        return null;
    }

    // Rule: Tick Scalping
    private checkTickScalping(trade: Trade, minDuration: number): RiskViolation | null {
        if (!trade.close_time) return null;
        const duration = (new Date(trade.close_time).getTime() - new Date(trade.open_time).getTime()) / 1000;

        if (duration < minDuration) {
            return {
                violation_type: 'tick_scalping',
                severity: 'breach',
                description: `Scalping Detected: Duration ${duration}s < Minimum ${minDuration}s`,
                trade_ticket: trade.ticket_number
            };
        }
        return null;
    }
}
