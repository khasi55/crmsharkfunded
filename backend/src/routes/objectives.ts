import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { supabase } from '../lib/supabase';

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
router.post('/calculate', async (req: any, res: Response) => {
    // console.log(`📊 OBJECTIVES CALCULATE ENDPOINT HIT`);

    try {
        const { challenge_id } = req.body;

        // console.log(`Calculate Request for Challenge: ${challenge_id}`);

        if (!challenge_id) {
            return res.status(400).json({ error: 'Missing challenge_id' });
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

        // Fetch challenge data with live equity/balance
        const { data: challenge } = await supabase
            .from('challenges')
            .select('max_daily_loss, max_total_loss, profit_target, current_equity, initial_balance, start_of_day_equity, current_balance')
            .eq('id', challenge_id)
            .single();

        const maxDailyLoss = Number(challenge?.max_daily_loss) || 5000;
        const maxTotalLoss = Number(challenge?.max_total_loss) || 10000;
        const profitTarget = Number(challenge?.profit_target) || 8000;

        // Use Realized PnL (Closed Trades Sum) to match Trade History (~-807)
        // instead of Equity which includes open PnL/credits (~-899)
        const realizedPnL = netPnL;
        console.log(`📊 Backend Realized PnL (Sum of Closed): ${realizedPnL}`);

        // 1. Total Loss (Drawdown) = -realizedPnL (if negative)
        const currentTotalLoss = realizedPnL < 0 ? Math.abs(realizedPnL) : 0;

        // 2. Daily Loss = Using today's closed trade sum
        const currentDailyLoss = dailyNetPnL < 0 ? Math.abs(dailyNetPnL) : 0;

        // 3. Profit = realizedPnL (if positive)
        const currentProfit = realizedPnL > 0 ? realizedPnL : 0;

        // Keep stats mainly for informational "Trade Analysis"
        // But override the Risk Metrics with the Live Equity Values above.

        return res.json({
            stats: {
                total_trades: totalTrades,
                total_lots: Number(totalLots.toFixed(2)),
                biggest_win: biggestWin,
                biggest_loss: biggestLoss
            },
            objectives: {
                daily_loss: {
                    current: currentDailyLoss,
                    max_allowed: maxDailyLoss,
                    remaining: Math.max(0, maxDailyLoss - currentDailyLoss),
                    threshold: maxDailyLoss * 0.95,
                    status: currentDailyLoss >= maxDailyLoss ? 'breached' : currentDailyLoss >= maxDailyLoss * 0.8 ? 'warning' : 'passed'
                },
                total_loss: {
                    current: currentTotalLoss,
                    max_allowed: maxTotalLoss,
                    remaining: Math.max(0, maxTotalLoss - currentTotalLoss),
                    threshold: maxTotalLoss * 0.9,
                    status: currentTotalLoss >= maxTotalLoss ? 'breached' : currentTotalLoss >= maxTotalLoss * 0.8 ? 'warning' : 'passed'
                },
                profit_target: {
                    current: currentProfit,
                    target: profitTarget,
                    remaining: Math.max(0, profitTarget - currentProfit),
                    threshold: profitTarget,
                    status: currentProfit >= profitTarget ? 'passed' : 'ongoing'
                }
            }
        });

    } catch (error) {
        console.error('🔥 Objectives error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
