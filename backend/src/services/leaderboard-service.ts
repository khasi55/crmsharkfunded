
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { broadcastLeaderboard } from './socket';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

// Cache to prevent DB hammering
const leaderboardCache: Record<string, { data: any[], timestamp: number }> = {};
const CACHE_TTL = 30 * 1000; // 30 seconds

export async function getLeaderboard(competitionId: string, limit: number = 100) {
    // console.log("!!! LEADERBOARD SERVICE CALL DETECTED !!!");
    // Check Cache
    const cacheKey = `${competitionId}-${limit}`;
    const cached = leaderboardCache[cacheKey];
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        return cached.data;
    }

    try {
        // Fetch participants sorted by score/rank, including challenge_id
        const { data: participants, error } = await supabase
            .from('competition_participants')
            .select('user_id, score, rank, status, challenge_id')
            .eq('competition_id', competitionId)
            .order('score', { ascending: false })
            .order('score', { ascending: false })
            .limit(limit);

        if (error) throw error;

        // Collect Challenge IDs to bulk fetch trades
        const challengeIds = participants
            .map(p => p.challenge_id)
            .filter(id => id !== null);

        // Fetch Trades for these challenges
        let tradesMap: Record<string, any[]> = {};
        if (challengeIds.length > 0) {
            const { data: trades, error: tradesError } = await supabase
                .from('trades')
                .select('challenge_id, profit_loss')
                .in('challenge_id', challengeIds)
                .not('close_time', 'is', null) // Only closed trades
                .gt('lots', 0); // Exclude deposits

            if (!tradesError && trades) {
                trades.forEach((t: any) => {
                    if (!tradesMap[t.challenge_id]) tradesMap[t.challenge_id] = [];
                    tradesMap[t.challenge_id].push(t);
                });
            }
        }

        // Fetch Challenges for initial balance AND STATUS
        let challengeMap: Record<string, any> = {};
        if (challengeIds.length > 0) {
            const { data: challenges } = await supabase
                .from('challenges')
                .select('id, initial_balance, status, current_equity')
                .in('id', challengeIds);

            if (challenges) {
                challenges.forEach((c: any) => challengeMap[c.id] = c);
            }
        }

        // Fetch profiles manually to ensure we get names
        const userIds = participants.map(p => p.user_id);
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]));

        const leaderboard = participants.map((p: any, index: number) => {
            const profile = profileMap.get(p.user_id);
            const userTrades = p.challenge_id ? (tradesMap[p.challenge_id] || []) : [];

            const trades_count = userTrades.length;
            const profit = userTrades.reduce((sum, t) => sum + (t.profit_loss || 0), 0);
            const winning_trades = userTrades.filter(t => (t.profit_loss || 0) > 0).length;
            const win_ratio = trades_count > 0 ? (winning_trades / trades_count) * 100 : 0;

            const challenge = p.challenge_id ? challengeMap[p.challenge_id] : null;
            const initialBalance = challenge?.initial_balance || 100000; // Default to 100k if missing

            // DYNAMIC SCORE CALCULATION
            const currentEquity = challenge?.current_equity ?? initialBalance;
            const equityProfit = currentEquity - initialBalance;
            const gain = initialBalance > 0 ? (equityProfit / initialBalance) * 100 : 0;

            // Prefer challenge status (e.g. 'failed') if available, otherwise participant status
            const effectiveStatus = challenge?.status || p.status;

            return {
                id: p.user_id,
                rank: index + 1,
                username: profile?.full_name || `Trader ${p.user_id.substring(0, 4)}...`,
                score: gain, // Use dynamic Gain % based on Equity
                status: effectiveStatus,
                avatar_url: profile?.avatar_url,
                trades_count,
                profit: equityProfit, // Use Equity Profit
                win_ratio,
                challenge_id: p.challenge_id
            };
        });



        // CUSTOM RULE: user says "breached accounts are out of race" -> Filter them out completely
        const activeLeaderboard = leaderboard.filter((p: any) => p.status !== 'breached' && p.status !== 'failed' && p.status !== 'disabled');

        // Sort by Score (Desc)
        activeLeaderboard.sort((a: any, b: any) => (b.score || 0) - (a.score || 0));

        // Re-assign rank
        activeLeaderboard.forEach((p: any, i: number) => p.rank = i + 1);

        // Update Cache
        leaderboardCache[cacheKey] = {
            data: activeLeaderboard,
            timestamp: Date.now()
        };

        return activeLeaderboard;

    } catch (error) {
        console.error("Leaderboard Service Error:", error);
        return [];
    }
}

// Polling Service for Broadcasting
let interval: NodeJS.Timeout | null = null;

// Helper to update scores in DB so sorting is correct
export async function updateLeaderboardScores(competitionId: string) {
    try {
        // 1. Fetch all participants with their challenge IDs
        const { data: participants, error } = await supabase
            .from('competition_participants')
            .select('user_id, challenge_id')
            .eq('competition_id', competitionId);

        if (error || !participants) return;

        const challengeIds = participants.map(p => p.challenge_id).filter(id => id !== null);
        if (challengeIds.length === 0) return;

        const { data: challenges } = await supabase
            .from('challenges')
            .select('id, initial_balance, current_equity, status')
            .in('id', challengeIds);

        const challengeMap = new Map(challenges?.map(c => [c.id, c]));

        // Fetch Trades for these challenges
        let tradesMap: Record<string, any[]> = {};
        if (challengeIds.length > 0) {
            const { data: trades, error: tradesError } = await supabase
                .from('trades')
                .select('challenge_id, profit_loss')
                .in('challenge_id', challengeIds)
                .not('close_time', 'is', null) // Only closed trades
                .gt('lots', 0); // Exclude deposits

            if (!tradesError && trades) {
                trades.forEach((t: any) => {
                    if (!tradesMap[t.challenge_id]) tradesMap[t.challenge_id] = [];
                    tradesMap[t.challenge_id].push(t);
                });
            }
        }

        // 3. Calculate Scores based on Equity (Floating PnL)
        const updates = participants.map(p => {
            if (!p.challenge_id) return { user_id: p.user_id, score: -999999, rank: 9999 };

            const challenge = challengeMap.get(p.challenge_id);
            if (!challenge) return { user_id: p.user_id, score: -999999, rank: 9999 };

            const initialBalance = challenge.initial_balance || 100000;
            const currentEquity = challenge.current_equity ?? initialBalance;

            // Calculate Profit based on Equity (Includes Floating PnL)
            const profit = currentEquity - initialBalance;

            // Calculate Gain based on Equity
            const gain = initialBalance > 0 ? (profit / initialBalance) * 100 : 0;
            const status = challenge.status;

            return {
                user_id: p.user_id,
                score: gain,
                status: status,
                competition_id: competitionId
            };
        });

        // 4. Sort by Score (Desc) to determine Rank (Breached at bottom)
        updates.sort((a, b) => {
            const isBadA = a.status === 'breached' || a.status === 'failed' || a.status === 'disabled';
            const isBadB = b.status === 'breached' || b.status === 'failed' || b.status === 'disabled';

            if (isBadA && !isBadB) return 1;
            if (!isBadA && isBadB) return -1;

            return b.score - a.score;
        });

        // 5. Assign Rank and Prepare Bulk Update
        const bulkUpdatePayload = updates.map((u, index) => ({
            user_id: u.user_id,
            competition_id: competitionId,
            score: u.score,
            rank: index + 1
        }));

        // 6. Perform Bulk Upsert
        if (bulkUpdatePayload.length > 0) {
            const { error: upsertError } = await supabase
                .from('competition_participants')
                .upsert(bulkUpdatePayload, { onConflict: 'competition_id, user_id' });

            if (upsertError) console.error(" Failed to update leaderboard scores:", upsertError);
        }

    } catch (e) {
        console.error("Error updating leaderboard scores:", e);
    }
}

export function startLeaderboardBroadcaster(intervalMs = 30000) {
    if (interval) return;

    console.log(` Leaderboard Broadcaster started (Interval: ${intervalMs}ms)`);

    interval = setInterval(async () => {
        try {
            // Find Active Competitions
            const { data: activeCompetitions } = await supabase
                .from('competitions')
                .select('id')
                .eq('status', 'active');

            if (!activeCompetitions) return;

            for (const comp of activeCompetitions) {
                // 1. UPDATE DB SCORES FIRST
                await updateLeaderboardScores(comp.id);

                // 2. Fetch fresh leaderboard
                // Invalidate all cache keys for this competition (naive simple approach: clear all or regex)
                // For simplicity, we just won't update cache explicitly here as it expires in 30s. 
                // But to be safe, let's delete the default key.
                delete leaderboardCache[`${comp.id}-100`];

                const data = await getLeaderboard(comp.id);
                broadcastLeaderboard(comp.id, data);
            }

        } catch (e) {
            console.error("Broadcaster Error:", e);
        }
    }, intervalMs);
}
