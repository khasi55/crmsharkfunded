import { Router, Response } from 'express';
import { supabase } from '../lib/supabase';
import fs from 'fs';

const router = Router();

const debugLog = (msg: string) => {
    const log = `[${new Date().toISOString()}] ${msg}\n`;
    fs.appendFileSync('backend_ranking_debug.log', log);
};

// Simple In-Memory Cache
let cache: { data: any[], timestamp: number } | null = null;
const CACHE_TTL = 60 * 1000; // 60 seconds

// GET /api/ranking
// Returns global leaderboard data
router.get('/', async (req, res) => {
    try {
        const { accountSize, refresh } = req.query;

        // Serve Cache if valid and no refresh requested
        if (cache && (Date.now() - cache.timestamp < CACHE_TTL) && !refresh) {
            // Filter cache in-memory if needed
            let cachedData = cache.data;
            if (accountSize && accountSize !== 'All') {
                const sizeText = `${parseInt(accountSize as string)}k`;
                cachedData = cachedData.filter(d => d.accountSize === sizeText);
            }
            debugLog(`Serving ${cachedData.length} entries from cache`);
            return res.json(cachedData);
        }

        debugLog(`Fetching fresh ranking for accountSize: ${accountSize || 'All'}`);

        // 1. Fetch active challenges (LIMIT 500 to prevent crash)
        let query = supabase
            .from('challenges')
            .select(`
                id,
                user_id,
                initial_balance,
                current_balance,
                status
            `)
            .eq('status', 'active')
            .limit(500); // SECURITY FIX: Limit rows

        if (accountSize && accountSize !== 'All') {
            const sizeValue = parseInt(accountSize as string) * 1000;
            if (!isNaN(sizeValue)) {
                query = query.eq('initial_balance', sizeValue);
            }
        }

        const { data: challenges, error: challengesError } = await query;

        if (challengesError) {
            debugLog(`Supabase challenges error: ${challengesError.message}`);
            throw challengesError;
        }

        if (!challenges || challenges.length === 0) {
            debugLog('No active challenges found');
            return res.json([]);
        }

        debugLog(`Found ${challenges.length} active challenges`);

        // 2. Fetch profiles for these users
        const userIds = Array.from(new Set(challenges.map(c => c.user_id).filter(id => id)));
        debugLog(`Fetching profiles for ${userIds.length} users`);

        let profiles: any[] = [];
        if (userIds.length > 0) {
            const { data, error: profilesError } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url, country')
                .in('id', userIds);

            if (profilesError) {
                debugLog(`Profiles fetch error: ${profilesError.message}`);
                // Don't throw, just continue with empty profiles
            } else {
                profiles = data || [];
            }
        }

        const profileMap = new Map(profiles.map(p => [p.id, p]));
        debugLog(`Mapped ${profileMap.size} profiles`);

        // 3. Fetch trades to calculate Day Change and Profit
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const challengeIds = challenges.map(c => c.id).filter(id => id);
        debugLog(`Fetching trades for ${challengeIds.length} challenges`);

        let recentTrades: any[] = [];
        if (challengeIds.length > 0) {
            const { data, error: tradesError } = await supabase
                .from('trades')
                .select('challenge_id, profit_loss, close_time')
                .in('challenge_id', challengeIds)
                .not('close_time', 'is', null)
                .gt('lots', 0); // Exclude 0-lot depsits

            if (tradesError) {
                debugLog(`Trades fetch error: ${tradesError.message}`);
                // Don't throw, just continue with empty trades
            } else {
                recentTrades = data || [];
            }
        }
        debugLog(`Found ${recentTrades.length} trades`);

        // 4. Process data
        const leaderboard = challenges.map((c: any) => {
            const challengeTrades = recentTrades.filter(t => t.challenge_id === c.id);
            const totalProfit = challengeTrades.reduce((sum, t) => sum + (Number(t.profit_loss) || 0), 0);

            const dayTrades = challengeTrades.filter(t => t.close_time && new Date(t.close_time) >= today);
            const dayChange = dayTrades.reduce((sum, t) => sum + (Number(t.profit_loss) || 0), 0);

            const initialBalance = Number(c.initial_balance) || 100000;
            const returns = (totalProfit / initialBalance) * 100;

            const profile = profileMap.get(c.user_id) || {};

            return {
                id: c.id,
                name: profile.full_name || 'Anonymous',
                avatar: profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.user_id}`,
                country: profile.country || '🌍',
                accountSize: `${initialBalance / 1000}k`,
                dayChange,
                totalProfit,
                return: parseFloat(returns.toFixed(2))
            };
        });

        // 5. Sort by Profit and Take Top 100
        const sortedLeaderboard = leaderboard
            .sort((a, b) => b.totalProfit - a.totalProfit)
            .slice(0, 100)
            .map((item, index) => ({ ...item, rank: index + 1 }));

        debugLog(`Returning ${sortedLeaderboard.length} leaderboard entries`);

        // Update Cache
        cache = {
            data: sortedLeaderboard,
            timestamp: Date.now()
        };

        res.json(sortedLeaderboard);

    } catch (error: any) {
        debugLog(`CRITICAL ERROR: ${error.message}`);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

export default router;
