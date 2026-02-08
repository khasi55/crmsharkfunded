import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { supabase } from '../lib/supabase';
import { RulesService } from '../services/rules-service';
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
            .select('close_time, profit_loss')
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
            const totalPnL = dayTrades.reduce((sum, t) => sum + (t.profit_loss || 0), 0);
            return {
                date,
                trades: dayTrades.length,
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
router.get('/trades', authenticate, async (req: AuthRequest, res: Response) => {
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

        // 1. Efficient Stats Gathering
        let totalTrades = 0;
        let openTrades = 0;
        let closedTrades = 0;
        let totalPnL = 0;

        // Optimization: If accountId is provided, we can fetch PnL from challenge equity directly
        // and avoid scanning the entire trades table for simple counts.
        if (accountId) {
            const [
                { count: total },
                { count: open },
                { count: closed },
                { data: challenge }
            ] = await Promise.all([
                supabase.from('trades').select('*', { count: 'exact', head: true }).eq('challenge_id', accountId),
                supabase.from('trades').select('*', { count: 'exact', head: true }).eq('challenge_id', accountId).is('close_time', null),
                supabase.from('trades').select('*', { count: 'exact', head: true }).eq('challenge_id', accountId).not('close_time', 'is', null),
                supabase.from('challenges').select('initial_balance, current_equity').eq('id', accountId).single()
            ]);

            totalTrades = total || 0;
            openTrades = open || 0;
            closedTrades = closed || 0;

            if (challenge) {
                // Total PnL = Current Equity - Initial Balance
                // This is much faster than summing thousands of rows
                totalPnL = (Number(challenge.current_equity) || 0) - (Number(challenge.initial_balance) || 0);
            }
        } else {
            // Fallback for "All Accounts" view (less common, but needs support)
            // We'll stick to the simpler query but optimize selection
            const { data: allTradesForStats, error: statsError } = await baseQuery
                .select('profit_loss, commission, swap, close_time'); // Minimal columns

            if (statsError) throw statsError;

            const statsData = (allTradesForStats || []);
            totalTrades = statsData.length;
            openTrades = statsData.filter((t: any) => !t.close_time).length;
            closedTrades = statsData.filter((t: any) => t.close_time).length;
            totalPnL = statsData.reduce((sum: number, t: any) => sum + (Number(t.profit_loss) || 0) + (Number(t.commission) || 0) + (Number(t.swap) || 0), 0);
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
                commission: t.commission,
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

        console.log(`[DEBUG] /trades/analysis returning ${formattedTrades.length} formatted trades.`);

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

console.log('✅ Dashboard routes loaded, registering /objectives endpoint...');

// GET /api/dashboard/objectives
// Calculates risk metrics (daily loss, total loss, profit target) from trades
router.get('/objectives', authenticate, async (req: AuthRequest, res: Response) => {
    // console.log(`📊 Objectives endpoint HIT - Starting handler`);

    try {
        const user = req.user;
        const { challenge_id } = req.query;

        // console.log(`📊 Objectives endpoint called - User: ${user?.id}, Challenge: ${challenge_id}`);

        if (!user) {
            console.log('❌ No user - returning 401');
            return res.status(401).json({ error: 'Not authenticated' });
        }

        if (!challenge_id) {
            console.log('❌ No challenge_id - returning 400');
            return res.status(400).json({ error: 'Missing challenge_id' });
        }

        // console.log(`✅ Auth passed, fetching trades...`);

        // Fetch all trades for this challenge
        const { data: trades, error } = await supabase
            .from('trades')
            .select('*')
            .eq('challenge_id', challenge_id)
            .eq('user_id', user.id);

        if (error) {
            console.error('Error fetching trades for objectives:', error);
            return res.status(500).json({ error: 'Database error' });
        }

        // console.log(`📊 Fetched ${trades?.length || 0} trades for challenge ${challenge_id}`);
        if (trades && trades.length > 0) {
            // console.log(`   Sample trade:`, trades[0]);
        }

        // Fetch challenge limits and DATA
        // Fetch challenge limits and DATA
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

        // console.log(`📤 Sending response:`, JSON.stringify(responseData, null, 2));
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
            .select('profit_loss, lots')
            .eq('challenge_id', challenge_id)
            .eq('user_id', user.id); // Implicit tenancy check

        if (error) {
            console.error('❌ DB Error fetching trades for consistency:', error);
            throw error;
        }

        // console.log(`✅ Found ${trades?.length || 0} trades for consistency.`);

        // Calculate consistency
        const winningTrades = (trades || []).filter(t => Number(t.profit_loss) > 0);
        // console.log(`📊 Stats: Total Trades=${trades?.length}, Winning=${winningTrades.length}`);

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
        const losingTrades = (trades || []).filter(t => Number(t.profit_loss) < 0);
        const totalLoss = losingTrades.reduce((sum, t) => sum + Math.abs(Number(t.profit_loss)), 0);
        const avgLoss = losingTrades.length > 0 ? totalLoss / losingTrades.length : 0;
        const avgTradeSize = (trades || []).reduce((sum, t) => sum + Number(t.lots), 0) / ((trades?.length) || 1);

        // History: placeholder for chart
        const history = [
            { date: new Date().toISOString().split('T')[0], score: consistencyScore }
        ];

        res.json({
            consistency: {
                score: consistencyScore,
                eligible: concentration <= 50 // Rule: Max single win 50%
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

export default router;
