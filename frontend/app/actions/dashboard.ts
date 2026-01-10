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

    // 2. Query DB
    const supabase = await createClient();

    // Fetch all closed trades for this account
    const { data: trades, error } = await supabase
        .from('trades')
        .select('close_time, profit_loss')
        .eq('challenge_id', challengeId)
        .not('close_time', 'is', null)
        .gte('close_time', startDate.toISOString())
        .order('close_time', { ascending: true });

    if (error) {
        console.error('DB Error fetching trades for equity:', error);
        return [];
    }

    if (!trades || trades.length === 0) {
        return [];
    }

    // 3. Compute Cumulative Equity
    let runningEquity = initialBalance;
    let runningProfit = 0;

    // Group trades by day
    const tradesByDay: Record<string, number> = {};
    trades.forEach(t => {
        const date = new Date(t.close_time).toISOString().split('T')[0];
        tradesByDay[date] = (tradesByDay[date] || 0) + (t.profit_loss || 0);
    });

    const sortedDays = Object.keys(tradesByDay).sort();

    const equityCurve = sortedDays.map(date => {
        const dailyPnL = tradesByDay[date];
        runningEquity += dailyPnL;
        runningProfit += dailyPnL;

        return {
            date: date,
            equity: runningEquity,
            profit: runningProfit,
            displayDate: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        };
    });

    // Add starting point if needed? 
    // Usually charts look better if they start at 0 days with Initial Balance.
    // But `daily_account_stats` only has days with trades.
    // We can prepend the start date if we knew it.
    // For now, let's just return the active days.

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
