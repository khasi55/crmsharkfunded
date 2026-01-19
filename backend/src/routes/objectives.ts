import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { supabase } from '../lib/supabase';
import { RulesService } from '../services/rules-service';
import * as fs from 'fs';

const router = Router();
console.log('✅ Objectives module loaded!');

router.use((req, res, next) => {
    // console.log(`[Objectives Router] ${req.method} ${req.path}`);
    next();
});

router.get('/ping', (req, res) => {
    console.log('🏓 PING HIT');
    res.json({ pong: true });
});

// POST /api/objectives/calculate
// Calculates risk metrics from trades
router.post('/calculate', authenticate, async (req: AuthRequest, res: Response) => {
    // console.log(`📊 OBJECTIVES CALCULATE ENDPOINT HIT`);

    try {
        // console.log("📊 OBJECTIVES HANDLER V3 - Checking for Breach Reason");
        const { challenge_id } = req.body;


        // fs.appendFileSync('backend_request_debug.log', `[OBJ-ENTRY] Body: ${JSON.stringify(req.body)}\n`);

        if (!challenge_id) {
            fs.appendFileSync('backend_request_debug.log', `[OBJ-ERROR] Missing Challenge ID\n`);
            return res.status(400).json({ error: 'Challenge ID required' });
        }

        // Fetch all trades for this challenge
        const { data: trades, error } = await supabase
            .from('trades')
            .select('*')
            .eq('challenge_id', challenge_id);

        if (error) {
            console.error('Error fetching trades:', error);
            return res.status(500).json({ error: 'Database error' });
        }

        // console.log(`📊 Fetched ${trades?.length || 0} trades`);
        if (trades && trades.length > 0) {
            // console.log('Sample Trade Data:', JSON.stringify(trades[0], null, 2));
        }

        // Initialize stats
        let totalTrades = 0;
        let totalLots = 0;
        let biggestWin = 0;
        let biggestLoss = 0;

        // Calculate metrics
        const today = new Date().toISOString().split('T')[0];
        let netPnL = 0;
        let dailyNetPnL = 0;

        (trades || []).forEach(trade => {
            // Filter out non-trading operations (deposits, withdrawals, balance, credit)
            // MT5 Deal Types: 0=Buy, 1=Sell, 2=Balance, 3=Credit, 4=Charge, 5=Correction, 6=Bonus, etc.
            const typeStr = String(trade.type).toLowerCase();
            const commentStr = String(trade.comment || '').toLowerCase();
            const symbolStr = String(trade.symbol || '');

            const isValidType = ['0', '1', 'buy', 'sell'].includes(typeStr);
            const isDeposit = commentStr.includes('deposit') || commentStr.includes('balance') || commentStr.includes('initial');
            const isInvalidSymbol = symbolStr.trim() === '';
            const isZeroLots = Number(trade.lots) === 0;

            if (!isValidType || isDeposit || isInvalidSymbol || isZeroLots) {
                // console.log(`Skipping non-trade: (Ticket: ${trade.ticket}, Type: ${trade.type}, Comment: ${trade.comment})`);
                return;
            }

            // Filter out invalid tickets (Ticket 0 is often an artifact)
            if (String(trade.ticket) === '0') {
                return;
            }

            // Calculate Net P&L for this trade including costs
            const profit = Number(trade.profit_loss ?? trade.profit ?? 0);
            const commission = Number(trade.commission ?? 0);
            const swap = Number(trade.swap ?? 0);
            const tradeNet = profit + commission + swap;

            // Update stats
            totalTrades++;
            totalLots += Number(trade.lots || 0);

            if (tradeNet > biggestWin) biggestWin = tradeNet;
            if (tradeNet < biggestLoss) biggestLoss = tradeNet;

            // Accumulate Total Net P&L
            netPnL += tradeNet;

            if (Number(trade.profit_loss) > 1000) {
                console.log(`🚨 SUSPICIOUS HIGH PROFIT TRADE: Ticket=${trade.ticket}, Type=${trade.type}, Profit=${trade.profit_loss}, Comment=${trade.comment}`);
            }

            // Daily P&L (only trades closed today)
            if (trade.close_time) {
                let tradeDate: string;
                if (typeof trade.close_time === 'number') {
                    tradeDate = new Date(trade.close_time * 1000).toISOString().split('T')[0];
                } else {
                    tradeDate = new Date(trade.close_time).toISOString().split('T')[0];
                }

                if (tradeDate === today) {
                    dailyNetPnL += tradeNet;
                }
            }
        });

        // Fetch challenge with LIVE equity
        const { data: challengeData, error: cError } = await supabase
            .from('challenges')
            .select('current_equity, initial_balance, start_of_day_equity, current_balance, status')
            .eq('id', challenge_id)
            .single();

        if (cError || !challengeData) {
            console.error("❌ Error fetching challenge data:", cError);
            return res.status(500).json({ error: 'Challenge data not found' });
        }

        // --- DYNAMIC RULES ---
        const { maxDailyLoss, maxTotalLoss, profitTarget, rules } = await RulesService.calculateObjectives(challenge_id);

        const initialBalance = Number(challengeData.initial_balance);
        const currentEquity = Number(challengeData.current_equity);
        // Fallback to initial balance if Start of Day is null (e.g. new account)
        const startOfDayEquity = Number(challengeData.start_of_day_equity ?? initialBalance);

        // 1. Daily Loss Calculation (Equity Based)
        // Formula: Net Change since Start of Day
        const dailyNet = currentEquity - startOfDayEquity;
        let dailyLoss = 0;
        let dailyProfit = 0;

        if (dailyNet >= 0) {
            dailyProfit = dailyNet;
            dailyLoss = 0; // In profit for the day
        } else {
            dailyLoss = Math.abs(dailyNet);
            dailyProfit = 0;
        }

        // 2. Total Loss Calculation (Equity Based)
        // Formula: Net Change since Inception
        const totalNet = currentEquity - initialBalance;
        let totalLoss = 0;
        let totalProfit = 0;

        if (totalNet >= 0) {
            totalProfit = totalNet;
            totalLoss = 0;
        } else {
            totalLoss = Math.abs(totalNet);
            totalProfit = 0;
        }

        // 3. REMAINING BUFFER CALCULATION (Crucial Fix)
        // Breach Level = SOD Equity - MaxDailyLoss
        // Remaining = CurrentEquity - BreachLevel
        const dailyBreachLevel = startOfDayEquity - maxDailyLoss;
        const dailyRemaining = Math.max(0, currentEquity - dailyBreachLevel);

        // Total Breach Level = Initial Balance - MaxTotalLoss
        const totalBreachLevel = initialBalance - maxTotalLoss;
        const totalRemaining = Math.max(0, currentEquity - totalBreachLevel);

        // 4. Profit Target
        // For profit target, we usually look at Total Profit (Realized + Floating) = totalNet
        const currentProfitMetric = Math.max(0, totalNet);


        const responsePayload = {
            stats: {
                total_trades: totalTrades,
                total_lots: Number(totalLots.toFixed(2)),
                biggest_win: biggestWin,
                biggest_loss: biggestLoss
            },
            objectives: {
                daily_loss: {
                    current: dailyLoss,
                    max_allowed: maxDailyLoss,
                    remaining: dailyRemaining,
                    threshold: dailyBreachLevel,
                    start_of_day_equity: startOfDayEquity,
                    status: currentEquity <= dailyBreachLevel ? 'breached' : 'passed'
                },
                total_loss: {
                    current: totalLoss,
                    max_allowed: maxTotalLoss,
                    remaining: totalRemaining,
                    threshold: totalBreachLevel,
                    status: currentEquity <= totalBreachLevel ? 'breached' : 'passed'
                },
                profit_target: {
                    current: currentProfitMetric,
                    target: profitTarget,
                    remaining: Math.max(0, profitTarget - currentProfitMetric),
                    threshold: profitTarget,
                    status: (profitTarget > 0 && currentProfitMetric >= profitTarget) ? 'passed' : 'ongoing'
                },
                rules: {
                    max_daily_loss_percent: rules.max_daily_loss_percent,
                    max_total_loss_percent: rules.max_total_loss_percent,
                    profit_target_percent: rules.profit_target_percent
                }
            }
        };


        // Use relative path to match server.ts
        // fs.appendFileSync('backend_request_debug.log', `[OBJECTIVES-RESP] ${JSON.stringify(responsePayload)}\n`);

        return res.json(responsePayload);

    } catch (error) {
        console.error('🔥 Objectives error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
