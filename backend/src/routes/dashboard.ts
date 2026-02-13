import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { supabase } from '../lib/supabase';
import { RulesService } from '../services/rules-service';
import { getRedis } from '../lib/redis';
import { objectivesLimiter, tradesLimiter } from '../middleware/rate-limit';
const fs = require('fs');

const router = Router();

// GET /api/dashboard/calendar
// Returns daily breakdown of trades for calendar view
router.get('/calendar', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;
        const { month, accountId } = req.query; // Expecting accountId

        if (!user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        let query = supabase
            .from('trades')
            .select('close_time, profit_loss, commission, swap')
            .eq('user_id', user.id)
            .order('close_time', { ascending: true, nullsFirst: false });

        // Filter by Account (Challenge ID)
        if (accountId) {
            query = query.eq('challenge_id', accountId);
        }

        // Filter by Month
        if (month && typeof month === 'string') {
            const startDate = new Date(`${month}-01`);
            // Handle invalid date
            if (!isNaN(startDate.getTime())) {
                const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
                query = query
                    .gte('close_time', startDate.toISOString())
                    .lte('close_time', endDate.toISOString());
            }
        }

        const { data: trades, error } = await query;

        if (error) {
            console.error('Error fetching calendar trades:', error);
            res.status(500).json({ error: 'Failed to fetch calendar data' });
            return;
        }

        // Prepare response structure matching frontend expectation
        // Frontend expects { trades: [...] } and calculates day stats itself? 
        // Checking TradeMonthlyCalendar.tsx:
        // const result = await response.json();
        // result.trades?.forEach...
        // So it uses 'trades' array.

        // The original API also returned `calendar: dailyStats`.
        // I will replicate that just in case (though frontend code viewed only used result.trades).

        const tradesData = trades || [];

        // Group trades by day for stats
        const tradesByDay: Record<string, any[]> = {};
        tradesData.forEach((trade: any) => {
            if (trade.close_time) {
                const day = new Date(trade.close_time).toISOString().split('T')[0];
                if (!tradesByDay[day]) tradesByDay[day] = [];
                tradesByDay[day].push(trade);
            }
        });

        const dailyStats = Object.entries(tradesByDay).map(([date, dayTrades]) => {
            // Filter out balance/deposit transactions for performance metrics
            const tradingTrades = dayTrades.filter((t: any) => t.symbol && t.symbol !== '');

            // Fix: Commission is reported per-side (or half), so we deduct it twice to match Net P&L
            const totalPnL = tradingTrades.reduce((sum, t) => sum + (Number(t.profit_loss) || 0) + (Number(t.commission || 0) * 2) + (Number(t.swap) || 0), 0);
            return {
                date,
                trades: tradingTrades.length,
                profit: totalPnL,
                isProfit: totalPnL > 0,
            };
        });

        res.json({
            calendar: dailyStats,
            trades: tradesData
        });

    } catch (error: any) {
        console.error('Dashboard calendar API error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/dashboard/trades
router.get('/trades', authenticate, tradesLimiter, async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;
        const { accountId, filter, limit, page } = req.query;

        if (!user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        // Base Query
        let baseQuery = supabase
            .from('trades')
            .select('id, ticket, symbol, type, lots, open_price, close_price, open_time, close_time, profit_loss, commission, swap, comment', { count: 'exact' })
            .eq('user_id', user.id);

        if (accountId) {
            baseQuery = baseQuery.eq('challenge_id', accountId);
        }

        // Filter by Status
        if (filter === 'open') {
            baseQuery = baseQuery.is('close_time', null);
        } else if (filter === 'closed') {
            baseQuery = baseQuery.not('close_time', 'is', null);
        }

        // --- Aggregation Stats (Run separately or optimize) ---
        // We need: Total Trades, Open Trades, Closed Trades, Total PnL.
        // Doing this efficiently requires specific aggregation queries or post-processing if volume is low.
        // For performance on large datasets, we should use RPC or separate count queries.
        // "Total PnL" is the most expensive to calculate if we don't scan all rows. 
        // Let's assume for now we use a separate efficient query for stats if possible, 
        // or just accept we might need to sum on DB side.
        // Supabase doesn't easily support "Sum" without RPC. 
        // Strategy: Fetch ALL "profit_loss" column only for the stats (lightweight), and Paginator for the rows.

        // Efficient Stats Gathering
        let totalTrades = 0;
        let openTrades = 0;
        let closedTrades = 0;
        let totalPnL = 0;
        let statsLoaded = false;

        if (true) {
            // Optimization: Fetch stats using targeted queries
            const fetchStats = async () => {
                let countQuery = supabase
                    .from('trades')
                    .select('id', { count: 'exact', head: true })
                    .eq('user_id', user.id);

                if (accountId) countQuery = countQuery.eq('challenge_id', accountId);
                const { count: totalCount } = await countQuery;

                let pnlQuery = supabase
                    .from('trades')
                    .select('profit_loss, commission, swap, close_time')
                    .eq('user_id', user.id);

                if (accountId) pnlQuery = pnlQuery.eq('challenge_id', accountId);

                const { data: pnlData } = await pnlQuery;

                const totalTradesVal = totalCount || 0;
                const tradesForStats: any[] = pnlData || [];

                // Exclude balance transactions from P&L and Trade counts
                const tradingStatsTrades = tradesForStats.filter((t: any) => t.symbol && t.symbol !== '' && Number(t.lots) > 0);

                const openTradesVal = tradingStatsTrades.filter((t: any) => !t.close_time).length;
                const closedTradesVal = tradingStatsTrades.filter((t: any) => t.close_time).length;
                const totalPnLVal = tradingStatsTrades.reduce((sum: number, t: any) => sum + (Number(t.profit_loss) || 0) + ((Number(t.commission) || 0) * 2) + (Number(t.swap) || 0), 0);

                return { totalTrades: totalTradesVal, openTrades: openTradesVal, closedTrades: closedTradesVal, totalPnL: totalPnLVal };
            };

            const stats = await fetchStats();
            totalTrades = stats.totalTrades;
            openTrades = stats.openTrades;
            closedTrades = stats.closedTrades;
            totalPnL = stats.totalPnL;
        }

        // 2. Fetch Paginated Rows
        const pageNum = Number(page || 1);
        const limitNum = Number(limit || 20);
        const from = (pageNum - 1) * limitNum;
        const to = from + limitNum - 1;

        // console.time('stats_fetch'); // START TIMER

        let paginatedQuery = supabase
            .from('trades')
            .select('id, ticket, symbol, type, lots, open_price, close_price, open_time, close_time, profit_loss, commission, swap, comment')
            .eq('user_id', user.id)
            .order('open_time', { ascending: false })
            .range(from, to);

        if (accountId) paginatedQuery = paginatedQuery.eq('challenge_id', accountId);
        if (filter === 'open') paginatedQuery = paginatedQuery.is('close_time', null);
        else if (filter === 'closed') paginatedQuery = paginatedQuery.not('close_time', 'is', null);

        const { data: trades, error } = await paginatedQuery;

        // console.timeEnd('stats_fetch'); // END TIMER - prints to console

        if (error) {
            console.error('Error fetching trades:', error);
            res.status(500).json({ error: 'Failed to fetch trades' });
            return;
        }

        // Format trades for frontend
        const formattedTrades = (trades || [])
            .map(t => ({
                id: t.id,
                ticket_number: t.ticket,
                symbol: t.symbol,
                type: t.type, // 'buy' or 'sell'
                lots: t.lots,
                open_price: t.open_price,
                close_price: t.close_price,
                open_time: t.open_time,
                close_time: t.close_time,
                profit_loss: t.profit_loss,
                commission: (Number(t.commission) || 0) * 2, // Return full commission cost
                swap: t.swap
            }));

        res.json({
            trades: formattedTrades,
            stats: {
                totalTrades,
                openTrades,
                closedTrades,
                totalPnL
            },
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: totalTrades,
                totalPages: Math.ceil(totalTrades / limitNum)
            }
        });

    } catch (error) {
        console.error('Dashboard trades API error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/dashboard/trades/analysis
router.get('/trades/analysis', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;
        const { accountId } = req.query;

        if (!user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        let query = supabase
            .from('trades')
            .select('id, ticket, symbol, type, lots, open_price, close_price, open_time, close_time, profit_loss, comment')
            .eq('user_id', user.id)
            .gt('lots', 0) // Filter out zero lots (deposits)
            .not('symbol', 'is', null) // Filter invalid symbols
            .gt('open_time', '2023-01-01') // Filter out 1970/old garbage
            .or('type.eq.0,type.eq.1,type.eq.buy,type.eq.sell'); // Filter valid types (Buy/Sell)

        if (accountId) {
            query = query.eq('challenge_id', accountId);
        }

        const { data: trades, error } = await query;

        if (error) {
            console.error('Error fetching trade analysis:', error);
            res.status(500).json({ error: 'Database error' });
            return;
        }

        // Frontend expects "trades" array to do its own analysis
        const formattedTrades = (trades || []).map(t => ({ // Map directly since we filtered in DB
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
        }));

        res.json({ trades: formattedTrades });

    } catch (error) {
        console.error('Trade analysis API error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/dashboard/accounts
router.get('/accounts', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        const { data: accounts, error } = await supabase
            .from('challenges')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching dashboard accounts:', error);
            res.status(500).json({ error: 'Database error' });
            return;
        }

        res.json({ accounts: accounts || [] });

    } catch (error) {
        console.error('Dashboard accounts API error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// router.get('/objectives', ...);

// GET /api/dashboard/objectives
// Calculates risk metrics (daily loss, total loss, profit target) from trades
router.get('/objectives', authenticate, objectivesLimiter, async (req: AuthRequest, res: Response) => {
    // console.log(`📊 Objectives endpoint HIT - Starting handler`);

    try {
        const user = req.user;
        const { challenge_id } = req.query;

        // console.log(`📊 Objectives endpoint called - User: ${user?.id}, Challenge: ${challenge_id}`);

        if (!user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        if (!challenge_id) {
            return res.status(400).json({ error: 'Missing challenge_id' });
        }

        // Strict Tenancy Check: Verify challenge belongs to user
        const { data: challengeOwner, error: ownerError } = await supabase
            .from('challenges')
            .select('user_id')
            .eq('id', challenge_id)
            .single();

        if (ownerError || !challengeOwner) {
            return res.status(404).json({ error: 'Challenge not found' });
        }

        if (challengeOwner.user_id !== user.id) {
            console.warn(`[Security] Unauthorized access attempt by ${user.id} for challenge ${challenge_id}`);
            return res.status(403).json({ error: 'Forbidden: You do not own this challenge' });
        }

        // DYNAMIC RULES
        const { maxDailyLoss, maxTotalLoss, profitTarget, rules, challenge } = await RulesService.calculateObjectives(String(challenge_id));

        // METRICS BASED ON EQUITY (More accurate than summing trades)
        const initialBalance = Number(challenge.initial_balance);
        const currentEquity = Number(challenge.current_equity);
        const startOfDayEquity = Number(challenge.start_of_day_equity ?? initialBalance); // Fallback to Initial if NULL (e.g. Day 1)

        // 1. Daily Loss Calculation
        // Formula: How much have we lost since Start of Day?
        // If (Equity > SOD), Daily Loss is 0 (Profit).
        // If (Equity < SOD), Daily Loss is (SOD - Equity).
        const dailyNet = currentEquity - startOfDayEquity;
        let dailyLoss = 0;
        let dailyProfit = 0;

        if (dailyNet >= 0) {
            dailyProfit = dailyNet;
            dailyLoss = 0;
        } else {
            dailyLoss = Math.abs(dailyNet);
            dailyProfit = 0;
        }

        // 2. Total Loss Calculation
        // Formula: How much have we lost from Initial Balance?
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

        // 3. REMAINING BUFFER CALCULATION
        // Daily Remaining = (SOD Equity - DailyLimitAmount) - CurrentEquity ?
        // Actually simplest is: LimitAmount - DailyLoss.
        // BUT if user has Profit, the buffer is larger.
        // Standard Rule: "You cannot lose more than X amount from SOD Equity".
        // Breach Level = SOD Equity - MaxDailyLoss.
        // Remaining Buffer = CurrentEquity - BreachLevel.
        const dailyBreachLevel = startOfDayEquity - maxDailyLoss;
        const dailyRemaining = Math.max(0, currentEquity - dailyBreachLevel);

        // Total Remaining
        // Breach Level = Initial Balance - MaxTotalLoss.
        const totalBreachLevel = initialBalance - maxTotalLoss;
        const totalRemaining = Math.max(0, currentEquity - totalBreachLevel);


        // Pass-through Trade Analysis for specific dashboard charts if needed (optional)
        // ... (keeping trade fetch above for consistency check if needed, or remove to optimize)

        const responseData = {
            objectives: {
                daily_loss: {
                    current: dailyLoss,
                    max_allowed: maxDailyLoss,
                    remaining: dailyRemaining, // Now includes profit buffer
                    threshold: dailyBreachLevel, // The Equity value at which breach occurs
                    status: currentEquity <= dailyBreachLevel ? 'breached' : 'passed'
                },
                total_loss: {
                    current: totalLoss,
                    max_allowed: maxTotalLoss,
                    remaining: totalRemaining, // Now includes profit buffer
                    threshold: totalBreachLevel,
                    status: currentEquity <= totalBreachLevel ? 'breached' : 'passed'
                },
                profit_target: {
                    current: totalProfit,
                    target: profitTarget,
                    remaining: Math.max(0, profitTarget - totalProfit),
                    threshold: profitTarget,
                    status: totalProfit >= profitTarget ? 'passed' : 'ongoing'
                },
                stats: {
                    net_pnl: totalNet
                }
            }
        };

        return res.json(responseData);

    } catch (error) {
        console.error('🔥 Objectives API FATAL error:', error);
        return res.status(500).json({ error: 'Internal server error', details: String(error) });
    }
});


// GET /api/dashboard/risk
router.get('/risk', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;
        const { challenge_id } = req.query;

        if (!user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        if (!challenge_id) {
            res.status(400).json({ error: 'Missing challenge_id' });
            return;
        }

        // Verify Tenancy: Challenge must belong to user
        const { data: challenge, error: challengeError } = await supabase
            .from('challenges')
            .select('user_id')
            .eq('id', challenge_id)
            .single();

        if (challengeError || !challenge) {
            res.status(404).json({ error: 'Challenge not found' });
            return;
        }

        if (challenge.user_id !== user.id) {
            res.status(403).json({ error: 'Unauthorized access to challenge data' });
            return;
        }

        // Fetch risk violations (Hard Breaches)
        const { data: hardViolations, error: hardError } = await supabase
            .from('risk_violations')
            .select('*')
            .eq('challenge_id', challenge_id)
            .order('created_at', { ascending: false });

        if (hardError) {
            console.error('Error fetching hard risk violations:', hardError);
        }

        // Fetch advanced risk flags (Soft Breaches / behavioral)
        const { data: softViolations, error: softError } = await supabase
            .from('advanced_risk_flags')
            .select('*')
            .eq('challenge_id', challenge_id)
            .order('created_at', { ascending: false });

        if (softError) {
            console.error('Error fetching advanced risk flags:', softError);
        }

        // Normalize and merge
        const combinedViolations = [
            ...(hardViolations || []),
            ...(softViolations || []).map((v: any) => ({
                ...v,
                violation_type: v.flag_type, // Map flag_type to expected format
                is_soft_breach: true // Marker for frontend if needed
            }))
        ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        res.json({
            risk: {
                violations: combinedViolations
            }
        });

    } catch (error) {
        console.error('Risk API error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/dashboard/consistency
router.get('/consistency', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;
        const { challenge_id } = req.query;

        if (!user) return res.status(401).json({ error: 'Not authenticated' });
        if (!challenge_id) return res.status(400).json({ error: 'Missing challenge_id' });

        // Fetch trades
        // console.log(`🔍 Consistency Check - Challenge: ${challenge_id}, User: ${user.id}`);

        const { data: trades, error } = await supabase
            .from('trades')
            .select('profit_loss, lots, symbol')
            .eq('challenge_id', challenge_id)
            .eq('user_id', user.id); // Implicit tenancy check

        if (error) {
            console.error('❌ DB Error fetching trades for consistency:', error);
            throw error;
        }

        // console.log(`✅ Found ${trades?.length || 0} trades for consistency.`);

        // Calculate consistency
        // Exclude balance transactions
        const tradingTrades = (trades || []).filter(t => t.symbol && t.symbol !== '' && Number(t.lots) > 0);
        const winningTrades = tradingTrades.filter(t => Number(t.profit_loss) > 0);
        // console.log(`📊 Stats: Total Trading=${tradingTrades.length}, Winning=${winningTrades.length}`);

        const totalProfit = winningTrades.reduce((sum, t) => sum + Number(t.profit_loss), 0);
        const largestWin = winningTrades.reduce((max, t) => Math.max(max, Number(t.profit_loss)), 0);

        // console.log(`💰 Profit: Total=${totalProfit}, Largest=${largestWin}`);

        // Score logic: 100 - (Largest Win / Total Profit * 100)
        let consistencyScore = 100;
        let concentration = 0;

        if (totalProfit > 0) {
            concentration = (largestWin / totalProfit) * 100;
            consistencyScore = Math.max(0, 100 - concentration);
        }
        // console.log(`✅ Calculated Score: ${consistencyScore}% (Conc: ${concentration}%)`);

        // Stats
        const avgWin = winningTrades.length > 0 ? totalProfit / winningTrades.length : 0;
        const losingTrades = tradingTrades.filter(t => Number(t.profit_loss) < 0);
        const totalLoss = losingTrades.reduce((sum, t) => sum + Math.abs(Number(t.profit_loss)), 0);
        const avgLoss = losingTrades.length > 0 ? totalLoss / losingTrades.length : 0;
        const avgTradeSize = tradingTrades.reduce((sum, t) => sum + Number(t.lots), 0) / (tradingTrades.length || 1);

        // History: placeholder for chart
        const history = [
            { date: new Date().toISOString().split('T')[0], score: consistencyScore }
        ];

        res.json({
            consistency: {
                score: consistencyScore,
                eligible: concentration <= 50
            },
            stats: {
                avg_trade_size: avgTradeSize,
                avg_win: avgWin,
                avg_loss: avgLoss,
                largest_win: largestWin
            },
            history: history
        });

    } catch (error) {
        console.error('Consistency API error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/dashboard/sharing/toggle
router.post('/sharing/toggle', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;
        const { challengeId, enabled } = req.body;

        if (!user) return res.status(401).json({ error: 'Not authenticated' });
        if (!challengeId) return res.status(400).json({ error: 'Missing challengeId' });

        // Verify ownership
        const { data: challenge, error: fetchError } = await supabase
            .from('challenges')
            .select('user_id, share_token')
            .eq('id', challengeId)
            .single();

        if (fetchError || !challenge) return res.status(404).json({ error: 'Challenge not found' });
        if (challenge.user_id !== user.id) return res.status(403).json({ error: 'Unauthorized' });

        let shareToken = challenge.share_token;
        if (enabled && !shareToken) {
            // Generate a random unique token if none exists
            const crypto = require('crypto');
            shareToken = crypto.randomBytes(16).toString('hex');
        }

        const { error: updateError } = await supabase
            .from('challenges')
            .update({
                is_public: !!enabled,
                share_token: enabled ? shareToken : shareToken // Keep the token even if disabled, or null it? Let's keep it.
            })
            .eq('id', challengeId);

        if (updateError) throw updateError;

        res.json({
            success: true,
            is_public: !!enabled,
            share_token: enabled ? shareToken : null
        });
    } catch (error) {
        console.error('Sharing toggle error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/dashboard/bulk
// Consolidates all dashboard data into a single request for performance
router.get('/bulk', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;
        const { challenge_id, accountId } = req.query;
        const targetId = (challenge_id || accountId) as string;

        if (!user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        if (!targetId) {
            return res.status(400).json({ error: 'Missing challenge_id or accountId' });
        }

        // --- REDIS CACHE CHECK ---
        const redis = getRedis();
        const cacheKey = `dashboard:bulk:${targetId}`;

        try {
            const cachedData = await redis.get(cacheKey);
            if (cachedData) {
                // console.log(`🚀 [Bulk API] Cache Hit for ${targetId}`);
                return res.json(JSON.parse(cachedData));
            }
        } catch (err) {
            console.error('Redis cache get error:', err);
        }

        // Fetch everything in parallel
        // 1. Trades (Optimized select)
        // 2. Risk violations
        // 3. Consistency data
        // 4. Challenge data
        const [tradesResponse, riskResponse, consistencyResponse, challengeResponse] = await Promise.all([
            supabase.from('trades')
                .select('id, ticket, symbol, type, lots, open_price, close_price, open_time, close_time, profit_loss, commission, swap')
                .eq('challenge_id', targetId),
            supabase.from('risk_violations').select('*').eq('challenge_id', targetId).order('created_at', { ascending: false }),
            supabase.from('consistency_scores').select('*').eq('challenge_id', targetId).order('date', { ascending: false }).limit(30),
            supabase.from('challenges').select('*').eq('id', targetId).single()
        ]);

        if (challengeResponse.error || !challengeResponse.data) {
            return res.status(404).json({ error: 'Challenge not found' });
        }

        // Tenancy Check
        if (challengeResponse.data.user_id !== user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const allTrades = tradesResponse.data || [];
        const violations = riskResponse.data || [];
        const consistencyHistory = consistencyResponse.data || [];

        // CALCULATE OBJECTIVES & RULES
        const { maxDailyLoss, maxTotalLoss, profitTarget, rules } = await RulesService.calculateObjectives(targetId);

        const initialBalance = Number(challengeResponse.data.initial_balance);
        const currentEquity = Number(challengeResponse.data.current_equity);
        const startOfDayEquity = Number(challengeResponse.data.start_of_day_equity ?? initialBalance);

        let netPnL = 0;
        let totalLots = 0;
        let biggestWin = 0;
        let biggestLoss = 0;
        let grossProfit = 0;
        let grossLoss = 0;
        let winCount = 0;
        let loseCount = 0;
        const totalTrades = allTrades.length;

        allTrades.forEach(trade => {
            const profit = Number(trade.profit_loss) || 0;
            const comm = (Number(trade.commission) || 0) * 2;
            const swap = Number(trade.swap) || 0;
            const tradeNet = profit + comm + swap;

            netPnL += tradeNet;
            totalLots += Number(trade.lots) || 0;
            if (tradeNet > biggestWin) biggestWin = tradeNet;
            if (tradeNet < biggestLoss) biggestLoss = tradeNet;

            if (tradeNet > 0) {
                grossProfit += tradeNet;
                winCount++;
            } else if (tradeNet < 0) {
                grossLoss += Math.abs(tradeNet);
                loseCount++;
            }
        });

        const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss) : (grossProfit > 0 ? 100 : 0);
        const winRate = totalTrades > 0 ? (winCount / totalTrades) * 100 : 0;
        const avgWin = winCount > 0 ? (grossProfit / winCount) : 0;
        const avgLoss = loseCount > 0 ? (grossLoss / loseCount) : 0;

        // 1. Daily Loss (Equity Based)
        const dailyNet = currentEquity - startOfDayEquity;
        const dailyLoss = dailyNet >= 0 ? 0 : Math.abs(dailyNet);
        const dailyBreachLevel = startOfDayEquity - maxDailyLoss;
        const dailyRemaining = Math.max(0, currentEquity - dailyBreachLevel);

        // 2. Total Loss (Equity Based)
        const totalNet = currentEquity - initialBalance;
        const totalLoss = totalNet >= 0 ? 0 : Math.abs(totalNet);
        const totalBreachLevel = initialBalance - maxTotalLoss;
        const totalRemaining = Math.max(0, currentEquity - totalBreachLevel);

        // 3. Profit Target
        const currentProfitMetric = Math.max(0, totalNet);

        // CALCULATE CALENDAR
        const tradesByDay: Record<string, any[]> = {};
        allTrades.forEach((trade: any) => {
            if (trade.close_time) {
                const day = new Date(trade.close_time).toISOString().split('T')[0];
                if (!tradesByDay[day]) tradesByDay[day] = [];
                tradesByDay[day].push(trade);
            }
        });

        const dailyStats = Object.entries(tradesByDay).map(([date, dayTrades]) => {
            const tradingTrades = dayTrades.filter((t: any) => t.symbol && t.symbol !== '');
            const totalPnL = tradingTrades.reduce((sum, t) => sum + (Number(t.profit_loss) || 0) + (Number(t.commission || 0) * 2) + (Number(t.swap) || 0), 0);
            return {
                date,
                trades: tradingTrades.length,
                profit: totalPnL,
                isProfit: totalPnL > 0,
            };
        });

        const bullishCount = allTrades.filter(t => String(t.type).toLowerCase().includes('buy') || String(t.type) === '0').length;
        const bearishCount = allTrades.filter(t => String(t.type).toLowerCase().includes('sell') || String(t.type) === '1').length;

        let longWins = 0, longLosses = 0, longProfit = 0, longLossCost = 0, longCount = 0;
        let shortWins = 0, shortLosses = 0, shortProfit = 0, shortLossCost = 0, shortCount = 0;

        allTrades.forEach(trade => {
            const profit = Number(trade.profit_loss) || 0;
            const comm = (Number(trade.commission) || 0) * 2;
            const swap = Number(trade.swap) || 0;
            const tradeNet = profit + comm + swap;
            const tType = String(trade.type).toLowerCase();
            const isLong = tType === 'buy' || tType === '0';
            const isShort = tType === 'sell' || tType === '1';

            if (isLong) {
                longCount++;
                if (tradeNet > 0) {
                    longWins++;
                    longProfit += tradeNet;
                } else {
                    longLosses++;
                    longLossCost += Math.abs(tradeNet);
                }
            } else if (isShort) {
                shortCount++;
                if (tradeNet > 0) {
                    shortWins++;
                    shortProfit += tradeNet;
                } else {
                    shortLosses++;
                    shortLossCost += Math.abs(tradeNet);
                }
            }
        });

        const bulkData = {
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
                },
                stats: {
                    total_trades: totalTrades,
                    total_lots: Number(totalLots.toFixed(2)),
                    biggest_win: biggestWin,
                    biggest_loss: biggestLoss,
                    net_pnl: netPnL
                },
                challenge: challengeResponse.data
            },
            risk: {
                violations: violations,
                summary: {
                    total: violations.length,
                    latest: violations[0]?.created_at || null
                }
            },
            consistency: {
                history: consistencyHistory,
                score: consistencyHistory[0]?.score || 0
            },
            calendar: {
                stats: dailyStats
            },
            trades: {
                trades: allTrades.slice(0, 30)
            },
            analysis: {
                bullish: bullishCount,
                bearish: bearishCount,
                total: totalTrades,
                profit_factor: Number(profitFactor.toFixed(2)),
                win_rate: Number(winRate.toFixed(2)),
                avg_win: Number(avgWin.toFixed(2)),
                avg_loss: Number(avgLoss.toFixed(2)),
                gross_profit: Number(grossProfit.toFixed(2)),
                gross_loss: Number(grossLoss.toFixed(2)),
                win_count: winCount,
                lose_count: loseCount,
                daily_stats: dailyStats,
                long_stats: {
                    total: longCount,
                    wins: longWins,
                    losses: longLosses,
                    profit: Number(longProfit.toFixed(2)),
                    loss_cost: Number(longLossCost.toFixed(2)),
                    total_net: Number((longProfit - longLossCost).toFixed(2)),
                    win_rate: longCount > 0 ? Number(((longWins / longCount) * 100).toFixed(2)) : 0
                },
                short_stats: {
                    total: shortCount,
                    wins: shortWins,
                    losses: shortLosses,
                    profit: Number(shortProfit.toFixed(2)),
                    loss_cost: Number(shortLossCost.toFixed(2)),
                    total_net: Number((shortProfit - shortLossCost).toFixed(2)),
                    win_rate: shortCount > 0 ? Number(((shortWins / shortCount) * 100).toFixed(2)) : 0
                }
            }
        };

        // --- REDIS CACHE SET ---
        try {
            await redis.set(cacheKey, JSON.stringify(bulkData), 'EX', 300); // 5 minutes TTL
            // console.log(`💾 [Bulk API] Cached data for ${targetId}`);
        } catch (err) {
            console.error('Redis cache set error:', err);
        }

        res.json(bulkData);

    } catch (error) {
        console.error('Bulk API error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
