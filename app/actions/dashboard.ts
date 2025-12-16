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

    // Fetch daily stats
    const { data: stats, error } = await supabase
        .from('daily_account_stats')
        .select('date, daily_profit')
        .eq('challenge_id', challengeId)
        .gte('date', startDate.toISOString())
        .order('date', { ascending: true });

    if (error) {
        console.error('DB Error fetching daily stats:', error);
        return [];
    }

    // 3. Compute Cumulative Equity
    // If no stats yet (new account), return empty or initial point
    if (!stats || stats.length === 0) {
        return [];
        // Client side will handle empty state (flat line)
    }

    let runningEquity = initialBalance;
    let runningProfit = 0;

    const equityCurve = stats.map(day => {
        runningEquity += Number(day.daily_profit);
        runningProfit += Number(day.daily_profit);

        return {
            date: day.date,
            equity: runningEquity,
            profit: runningProfit,
            displayDate: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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
