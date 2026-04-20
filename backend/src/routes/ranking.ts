import { Router, Response } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

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
            let cachedData = cache.data;
            if (accountSize && accountSize !== 'All') {
                const sizeText = `${parseInt(accountSize as string)}k`;
                cachedData = cachedData.filter(d => d.accountSize === sizeText);
            }
            return res.json(cachedData);
        }

        // 🛡️ OPTIMIZED QUERY: Calculate values in-memory but sort by balance in DB
        // Profit = current_balance - initial_balance
        // Day Change = current_equity - start_of_day_equity
        let query = supabase
            .from('challenges')
            .select(`
                id,
                user_id,
                initial_balance,
                current_balance,
                current_equity,
                start_of_day_equity,
                status
            `)
            .eq('status', 'active')
            .order('current_balance', { ascending: false }) // Initial sort by balance
            .limit(1000);

        if (accountSize && accountSize !== 'All') {
            const sizeValue = parseInt(accountSize as string) * 1000;
            if (!isNaN(sizeValue)) {
                query = query.eq('initial_balance', sizeValue);
            }
        }

        const { data: challenges, error: challengesError } = await query;

        if (challengesError) {
            throw challengesError;
        }

        if (!challenges || challenges.length === 0) {
            return res.json([]);
        }

        // 2. Fetch profiles for these users in chunks
        const userIds = Array.from(new Set(challenges.map(c => c.user_id).filter(id => id)));

        let profiles: any[] = [];
        const CHUNK_SIZE = 100;
        for (let i = 0; i < userIds.length; i += CHUNK_SIZE) {
            const chunk = userIds.slice(i, i + CHUNK_SIZE);
            const { data, error: profilesError } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url, country')
                .in('id', chunk);

            if (!profilesError && data) {
                profiles = [...profiles, ...data];
            }
        }

        const profileMap = new Map(profiles.map(p => [p.id, p]));

        // 3. Process data
        const leaderboard = challenges.map((c: any) => {
            const initialBalance = Number(c.initial_balance) || 100000;
            const currentBalance = Number(c.current_balance) || initialBalance;
            const currentEquity = Number(c.current_equity) || currentBalance;
            const startOfDayEquity = Number(c.start_of_day_equity) || initialBalance;

            const totalProfit = currentBalance - initialBalance;
            const dayChange = currentEquity - startOfDayEquity;
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

        // 4. Final sort and Take Top 100
        const sortedLeaderboard = leaderboard
            .sort((a, b) => b.totalProfit - a.totalProfit)
            .slice(0, 100)
            .map((item, index) => ({ ...item, rank: index + 1 }));

        // Update Cache
        cache = {
            data: sortedLeaderboard,
            timestamp: Date.now()
        };

        res.json(sortedLeaderboard);

    } catch (error: any) {
        console.error('Ranking API error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
