'use server'

import { redis } from '@/lib/redis';
import { createClient } from '@/utils/supabase/server';

export async function getEquityCurveData(challengeId: string, initialBalance: number, period: string = '1M') {
    const CACHE_KEY = `dashboard:equity:${challengeId}:${period}`;

    // 1. Try Cache
    try {
        const cached = await redis.get(CACHE_KEY);
        if (cached) {
            console.log('⚡ Redis Cache Hit for Equity Curve');
            return JSON.parse(cached);
        }
    } catch (e) {
        console.warn('Redis error (get):', e);
    }

    console.log('🐢 Cache Miss - Fetching from DB');

    // Calculate start date
    const startDate = new Date();
    switch (period) {
        case '1D': startDate.setDate(startDate.getDate() - 1); break;
        case '1W': startDate.setDate(startDate.getDate() - 7); break;
        case '1M': startDate.setDate(startDate.getDate() - 30); break;
        case '3M': startDate.setDate(startDate.getDate() - 90); break;
        case 'ALL': startDate.setFullYear(2000); break; // Far past
        default: startDate.setDate(startDate.getDate() - 30);
    }

    // 3. Query DB
    const supabase = await createClient();

    // Fetch challenge details (status, current_equity) along with trades
    const { data: challenge } = await supabase
        .from('challenges')
        .select('status, current_equity, created_at')
        .eq('id', challengeId)
        .single();

    // 2b. Calculate Prior PnL if period is filtered
    let priorPnL = 0;
    if (period !== 'ALL') {
        const { data: priorTrades } = await supabase
            .from('trades')
            .select('profit_loss, commission, swap')
            .eq('challenge_id', challengeId)
            .lt('close_time', startDate.toISOString())
            .not('close_time', 'is', null);

        if (priorTrades) {
            priorPnL = priorTrades.reduce((sum, t) => sum + (t.profit_loss || 0) + (t.commission || 0) + (t.swap || 0), 0);
        }
    }

    // Fetch all closed trades for this account
    // Must select commission and swap too
    const { data: trades, error } = await supabase
        .from('trades')
        .select('close_time, profit_loss, commission, swap')
        .eq('challenge_id', challengeId)
        .not('close_time', 'is', null)
        .gte('close_time', startDate.toISOString())
        .order('close_time', { ascending: true });

    if (error) {
        console.error('DB Error fetching trades for equity:', error);
        return [];
    }

    // 3. Compute Cumulative Equity from Closed Trades (Trade-Wise)
    let runningEquity = initialBalance + priorPnL;
    let runningProfit = priorPnL;

    const equityCurve = (trades || []).map(t => {
        const grossPnl = t.profit_loss || 0;
        const fees = (t.commission || 0) + (t.swap || 0);
        const netPnl = grossPnl + fees;

        runningEquity += netPnl;
        runningProfit += netPnl;

        const dateObj = new Date(t.close_time);

        return {
            date: t.close_time, // Full timestamp for trade-wise
            equity: runningEquity,
            profit: runningProfit,
            displayDate: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        };
    });

    // 4. Prepend Start Point of the period
    const startPointDate = (period === 'ALL' && challenge?.created_at) ? challenge.created_at : startDate.toISOString();
    const dObj = new Date(startPointDate);
    // If period is ALL, use Created date.
    equityCurve.unshift({
        date: startPointDate,
        equity: initialBalance + priorPnL, // Equity at start of this period
        profit: priorPnL,
        displayDate: dObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    });

    // --- MANIPULATION FOR BREACHED ACCOUNTS ---
    // If account is breached/failed, the Equity Curve should probably end at the BREACH EQUITY
    // This ensures "Total P&L" matches the Objectives panel.
    if (challenge && (challenge.status === 'breached' || challenge.status === 'failed')) {
        const currentEquity = Number(challenge.current_equity);
        const equityDiff = currentEquity - initialBalance;
        const today = new Date().toISOString().split('T')[0];

        // Ensure we have a point for today (or replace the last point if it is today)
        const lastPoint = equityCurve[equityCurve.length - 1];

        // If the calculated equity from closed trades matches currentEquity, we are good.
        // If not (e.g. open trades caused breach), we must show the drop.

        // Only append/fix if there is a discrepancy > $1 (to ignore floating point noise)
        // Or simplified: Just push the current equity as the "Latest" status.

        // If we have points, check date (compare YYYY-MM-DD part)
        if (lastPoint && lastPoint.date.startsWith(today)) {
            // Overwrite today's point with Real Equity
            lastPoint.equity = currentEquity;
            lastPoint.profit = equityDiff;
        } else {
            // Append new point for "Now"
            equityCurve.push({
                date: new Date().toISOString(),
                equity: currentEquity,
                profit: equityDiff,
                displayDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
            });
        }
    }

    // 4. Set Cache (60 seconds)
    try {
        if (equityCurve.length > 0) {
            await redis.set(CACHE_KEY, JSON.stringify(equityCurve), 'EX', 60);
        }
    } catch (e) {
        console.warn('Redis error (set):', e);
    }

    return equityCurve;
}
