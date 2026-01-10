import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { supabase } from '../lib/supabase';
import { Trade } from '../engine/risk-engine-core'; // Import Trade type

const router = Router();

// GET /api/overview/stats
router.get('/stats', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        // Fetch ALL trades for the user across all accounts
        const { data: trades, error: tradesError } = await supabase
            .from('trades')
            .select('*')
            .eq('user_id', user.id)
            .gt('lots', 0); // Exclude deposits

        if (tradesError) {
            console.error('Error fetching trades:', tradesError);
            res.status(500).json({ error: 'Failed to fetch trades' });
            return;
        }

        const tradesData = (trades || []) as Trade[]; // Cast to Trade[]

        // --- Calculate Statistics ---

        // 1. General Stats
        const totalTrades = tradesData.length;
        const buyTrades = tradesData.filter(t => t.type === 'buy');
        const sellTrades = tradesData.filter(t => t.type === 'sell');
        const buyCount = buyTrades.length;
        const sellCount = sellTrades.length;

        // 2. Daily Performance (Sum P&L per weekday)
        const dailyPerformance: Record<string, number> = {
            Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0
        };

        tradesData.forEach(t => {
            if (t.close_time && t.profit_loss !== null) {
                const date = new Date(t.close_time);
                const day = date.getDay(); // 0=Sun
                const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                const dayStr = days[day];
                if (dailyPerformance[dayStr] !== undefined) {
                    dailyPerformance[dayStr] += Number(t.profit_loss);
                }
            }
        });

        const dailyChartData = Object.entries(dailyPerformance).map(([label, value]) => ({
            label,
            value
        }));

        // 3. Profitability
        const closedTrades = tradesData.filter(t => t.close_time);
        const wonTrades = closedTrades.filter(t => (t.profit_loss || 0) > 0);
        const lostTrades = closedTrades.filter(t => (t.profit_loss || 0) <= 0);
        const wonCount = wonTrades.length;
        const lostCount = lostTrades.length;
        const totalClosed = closedTrades.length;
        const winRate = totalClosed > 0 ? (wonCount / totalClosed) * 100 : 0;
        const wonPct = totalClosed > 0 ? (wonCount / totalClosed) * 100 : 0;
        const lostPct = totalClosed > 0 ? (lostCount / totalClosed) * 100 : 0;

        // Avg Holding Time
        let totalDuration = 0;
        closedTrades.forEach(t => {
            const start = new Date(t.open_time).getTime();
            const end = new Date(t.close_time!).getTime();
            totalDuration += (end - start);
        });
        const avgDurationMs = totalClosed > 0 ? totalDuration / totalClosed : 0;
        let avgHolding = "0m";
        if (avgDurationMs > 0) {
            const minutes = Math.floor(avgDurationMs / 60000);
            if (minutes < 60) avgHolding = `${minutes}m`;
            else {
                const hours = Math.floor(minutes / 60);
                if (hours < 24) avgHolding = `${hours}h`;
                else {
                    const days = Math.floor(hours / 24);
                    avgHolding = `${days}d ${hours % 24}h`;
                }
            }
        }

        // 4. Most Traded Instruments
        const instrumentCounts: Record<string, { wins: number, losses: number }> = {};
        closedTrades.forEach(t => {
            if (!instrumentCounts[t.symbol]) instrumentCounts[t.symbol] = { wins: 0, losses: 0 };
            if ((t.profit_loss || 0) > 0) instrumentCounts[t.symbol].wins++;
            else instrumentCounts[t.symbol].losses++;
        });

        const instruments = Object.entries(instrumentCounts)
            .map(([symbol, stats]) => ({
                symbol,
                wins: stats.wins,
                losses: stats.losses,
                total: stats.wins + stats.losses
            }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 3);

        // 5. Session Win Rates
        const sessionStats = {
            Asia: { wins: 0, total: 0 },
            London: { wins: 0, total: 0 },
            "New York": { wins: 0, total: 0 }
        };
        closedTrades.forEach(t => {
            const hour = new Date(t.open_time).getUTCHours();
            let session = '';
            if (hour >= 22 || hour < 7) session = 'Asia';
            else if (hour >= 7 && hour < 13) session = 'London';
            else if (hour >= 13 && hour < 22) session = 'New York';

            if (session) {
                // @ts-ignore
                sessionStats[session].total++;
                if ((t.profit_loss || 0) > 0) {
                    // @ts-ignore
                    sessionStats[session].wins++;
                }
            }
        });
        const sessions = Object.entries(sessionStats).map(([name, stats]) => ({
            name,
            winRate: stats.total > 0 ? (stats.wins / stats.total) * 100 : 0
        }));

        // 6. Balance History
        const { data: challenges } = await supabase
            .from('challenges')
            .select('initial_balance')
            .eq('user_id', user.id);

        let runningBalance = challenges?.reduce((sum, c) => sum + Number(c.initial_balance), 0) || 0;
        const balanceMap: Record<string, number> = {};

        const historyTrades = tradesData
            .filter(t => t.close_time)
            .sort((a, b) => new Date(a.close_time!).getTime() - new Date(b.close_time!).getTime());

        const earliestDate = historyTrades.length > 0
            ? new Date(historyTrades[0].open_time)
            : new Date();
        earliestDate.setDate(earliestDate.getDate() - 1);
        balanceMap[earliestDate.toISOString().split('T')[0]] = runningBalance;

        historyTrades.forEach(t => {
            if (t.close_time && t.profit_loss !== null) {
                runningBalance += Number(t.profit_loss);
                const dateStr = new Date(t.close_time).toISOString().split('T')[0];
                balanceMap[dateStr] = runningBalance;
            }
        });

        const balanceHistory = Object.entries(balanceMap)
            .map(([date, value]) => ({ date, value }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        res.json({
            overview: {
                totalTrades,
                buyCount,
                sellCount,
                dailyChartData,
                profitability: { winRate, wonCount, lostCount, wonPct, lostPct, avgHolding },
                instruments,
                sessions,
                balanceHistory
            }
        });

    } catch (error: any) {
        console.error('Overview API error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
