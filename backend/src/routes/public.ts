import { Router, Response, Request } from 'express';
import { supabase } from '../lib/supabase';
import { RulesService } from '../services/rules-service';

const router = Router();

// GET /api/public/performance/:token
// Returns public dashboard data for a shared account
router.get('/performance/:token', async (req: Request, res: Response) => {
    try {
        const { token } = req.params;

        // 1. Fetch the challenge by share_token
        const { data: challenge, error: challengeError } = await supabase
            .from('challenges')
            .select('*')
            .eq('share_token', token)
            .eq('is_public', true)
            .single();

        if (challengeError || !challenge) {
            console.error('Public performance trace: Dashboard not found', { token, challengeError });
            return res.status(404).json({ error: 'Shared dashboard not found or expired' });
        }

        // 1b. Fetch profile for referral code (doing it separately due to relationship mapping issues)
        const { data: profile } = await supabase
            .from('profiles')
            .select('referral_code')
            .eq('id', challenge.user_id)
            .single();

        const challengeId = challenge.id;

        // 2. Fetch Objectives/Stats using the token (bypassing auth since it's public)
        const objectivesData = await RulesService.calculateObjectives(String(challengeId));

        // 3. Normalized Objectives response (same as dashboard/objectives)
        const initialBalance = Number(challenge.initial_balance);
        const currentEquity = Number(challenge.current_equity);
        const startOfDayEquity = Number(challenge.start_of_day_equity ?? initialBalance);
        const { maxDailyLoss, maxTotalLoss, profitTarget } = objectivesData;

        const dailyNet = currentEquity - startOfDayEquity;
        const dailyLoss = dailyNet < 0 ? Math.abs(dailyNet) : 0;
        const totalNet = currentEquity - initialBalance;
        const totalLoss = totalNet < 0 ? Math.abs(totalNet) : 0;
        const totalProfit = totalNet > 0 ? totalNet : 0;

        const dailyBreachLevel = startOfDayEquity - maxDailyLoss;
        const dailyRemaining = Math.max(0, currentEquity - dailyBreachLevel);
        const totalBreachLevel = initialBalance - maxTotalLoss;
        const totalRemaining = Math.max(0, currentEquity - totalBreachLevel);

        // 4. Fetch ALL Trades for analysis and curve calculation
        // To build a proper equity curve and analysis, we need more than just the latest 100.
        // For public view, we'll fetch all unless it's thousands (limit to 1000 for safety).
        const { data: allTrades } = await supabase
            .from('trades')
            .select('id, ticket, symbol, type, lots, open_price, close_price, open_time, close_time, profit_loss, commission, swap')
            .eq('challenge_id', challengeId)
            .order('close_time', { ascending: true }) // Ascending for curve calculation
            .not('close_time', 'is', null);

        // Pre-calculate Equity Curve
        let runningEquity = initialBalance;
        let runningProfit = 0;

        // Filter out non-trading operations from the curve
        const tradingTradesOnly = (allTrades || []).filter(t => {
            const symbol = (t.symbol || '');
            const isNonTrade = symbol.trim() === '' || symbol === '#N/A';
            return !isNonTrade;
        });

        const equityCurve = tradingTradesOnly.map(t => {
            const netPnl = (Number(t.profit_loss) || 0) + (Number(t.commission) || 0) + (Number(t.swap) || 0);
            runningEquity += netPnl;
            runningProfit += netPnl;
            return {
                date: t.close_time,
                equity: runningEquity,
                profit: runningProfit,
                displayDate: new Date(t.close_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            };
        });

        // Add start point
        equityCurve.unshift({
            date: challenge.created_at,
            equity: initialBalance,
            profit: 0,
            displayDate: new Date(challenge.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        });

        // Calculate Stats for Analysis
        const winners = (allTrades || []).filter(t => (Number(t.profit_loss) || 0) > 0);
        const losers = (allTrades || []).filter(t => (Number(t.profit_loss) || 0) <= 0);

        const buyTrades = (allTrades || []).filter(t => String(t.type).toLowerCase() === 'buy' || String(t.type) === '0');
        const sellTrades = (allTrades || []).filter(t => String(t.type).toLowerCase() === 'sell' || String(t.type) === '1');

        // Fetch Risk Violations
        const { data: hardViolations } = await supabase
            .from('risk_violations')
            .select('*')
            .eq('challenge_id', challengeId)
            .order('created_at', { ascending: false });

        const { data: softViolations } = await supabase
            .from('advanced_risk_flags')
            .select('*')
            .eq('challenge_id', challengeId)
            .order('created_at', { ascending: false });

        const combinedViolations = [
            ...(hardViolations || []),
            ...(softViolations || []).map((v: any) => ({
                ...v,
                violation_type: v.flag_type,
                is_soft_breach: true
            }))
        ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        // Format trades for the history table (latest first)
        const historyTrades = tradingTradesOnly.reverse().slice(0, 100).map(t => ({
            id: t.id,
            ticket_number: t.ticket,
            symbol: t.symbol,
            type: t.type,
            lots: t.lots,
            open_price: t.open_price,
            close_price: t.close_price,
            open_time: t.open_time,
            close_time: t.close_time,
            profit_loss: t.profit_loss,
            commission: t.commission,
            swap: t.swap
        }));

        res.json({
            account: {
                id: challenge.id,
                account_number: challenge.challenge_number,
                account_type: challenge.challenge_type,
                status: challenge.status,
                initial_balance: initialBalance,
                current_balance: challenge.current_balance,
                current_equity: currentEquity,
                referral_code: profile?.referral_code,
            },
            objectives: {
                daily_loss: {
                    current: dailyLoss,
                    max_allowed: maxDailyLoss,
                    remaining: dailyRemaining,
                    threshold: dailyBreachLevel,
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
                    current: totalProfit,
                    target: profitTarget,
                    remaining: Math.max(0, profitTarget - totalProfit),
                    status: totalProfit >= profitTarget ? 'passed' : 'ongoing'
                }
            },
            trades: historyTrades,
            equityCurve: equityCurve,
            analysis: {
                all: allTrades || [],
                // We send all closed trades for detail analysis component to process
            },
            risk: {
                violations: combinedViolations
            }
        });

    } catch (error) {
        console.error('Public performance API error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
