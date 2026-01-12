import express, { Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = express.Router();
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

// GET /api/competitions - List active/upcoming competitions

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.query.userId as string || req.user?.id;

        const { data, error } = await supabase
            .from('competitions')
            .select('*, participants:competition_participants(count)')
            .in('status', ['upcoming', 'active'])
            .order('start_date', { ascending: true });

        if (error) throw error;

        // If userId is provided, check which competitions they validated
        let joinedCompetitions = new Set<string>();
        if (userId) {
            const { data: userJoins } = await supabase
                .from('competition_participants')
                .select('competition_id')
                .eq('user_id', userId);

            if (userJoins) {
                userJoins.forEach(j => joinedCompetitions.add(j.competition_id));
            }
        }

        const competitions = data.map((c: any) => ({
            ...c,
            participant_count: c.participants && c.participants[0] ? c.participants[0].count : 0,
            joined: joinedCompetitions.has(c.id)
        }));

        res.json(competitions);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/competitions - Admin create competition
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        console.log("Creating competition, body:", req.body);
        const { title, description, start_date, end_date, entry_fee, prize_pool, max_participants, platform, image_url, initial_balance } = req.body;

        const input: any = {
            title,
            start_date,
            end_date,
            entry_fee: Number(entry_fee),
            prize_pool: Number(prize_pool),
            max_participants: Number(max_participants),
            initial_balance: initial_balance ? Number(initial_balance) : 100000, // Default 100k
            platform: platform && platform.trim() !== "" ? platform : 'MetaTrader 5',
            status: 'upcoming'
        };

        if (description && description.trim() !== "") input.description = description;
        if (image_url && image_url.trim() !== "") {
            // image_url is an array type (text[]) in DB, so wrap it
            input.image_url = [image_url];
        }

        console.log("Sanitized input:", input);

        const { data, error } = await supabase
            .from('competitions')
            .insert([input])
            .select()
            .single();

        if (error) {
            console.error("Supabase insert error:", error);
            throw error;
        }
        res.json(data);
    } catch (error: any) {
        console.error("Create competition error:", error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/competitions/:id/join - User join competition
router.post('/:id/join', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        // Securely get user_id from token, ignore body
        const user_id = req.user?.id;

        if (!user_id) return res.status(401).json({ error: "Not authenticated" });

        // Check if already joined
        const { data: existing } = await supabase
            .from('competition_participants')
            .select('*')
            .eq('competition_id', id)
            .eq('user_id', user_id)
            .single();

        if (existing) {
            return res.status(400).json({ error: "Already joined" });
        }

        // Fetch competition to get account settings
        const { data: competition, error: compError } = await supabase
            .from('competitions')
            .select('initial_balance, platform')
            .eq('id', id)
            .single();

        if (compError) throw compError;

        const initialBalance = competition?.initial_balance || 100000;

        // Create Registration Record
        const { data: participant, error: regError } = await supabase
            .from('competition_participants')
            .insert([{ competition_id: id, user_id, status: 'registered' }])
            .select()
            .single();

        if (regError) throw regError;

        // --- AUTOMATIC MT5 ACCOUNT CREATION ---
        try {
            // 1. Get user details
            const { data: profile } = await supabase
                .from('profiles')
                .select('full_name, email')
                .eq('id', user_id)
                .single();

            // 2. Call MT5 Bridge
            const mt5ApiUrl = process.env.MT5_API_URL;
            const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/mt5`;

            const bridgeResponse = await fetch(`${mt5ApiUrl}/create-account`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: profile?.full_name || 'Trader',
                    email: profile?.email,
                    group: 'demo\\S\\Competition', // Default competition group
                    leverage: 100,
                    balance: initialBalance, // Dynamic Balance
                    callback_url: callbackUrl
                })
            });

            if (bridgeResponse.ok) {
                const mt5Data = await bridgeResponse.json() as any;

                // 3. Create challenge record
                const { data: challenge, error: challengeError } = await supabase
                    .from('challenges')
                    .insert({
                        user_id: user_id,
                        initial_balance: initialBalance,
                        current_balance: initialBalance,
                        current_equity: initialBalance,
                        start_of_day_equity: initialBalance,
                        status: 'active',
                        login: mt5Data.login,
                        master_password: mt5Data.password,
                        investor_password: mt5Data.investor_password || '',
                        server: 'Mazi Finance',
                        platform: 'MT5',
                        leverage: 100,
                        challenge_type: 'Competition', // Correct type for competitions
                        metadata: {
                            is_competition: true,
                            competition_id: id,
                            joined_at: new Date().toISOString()
                        }
                    })
                    .select()
                    .single();

                if (challengeError) {
                    console.error('Failed to create challenge for competition participant:', challengeError);
                }

                // 4. Update competition_participants
                await supabase
                    .from('competition_participants')
                    .update({
                        challenge_id: challenge?.id,
                        status: 'active'
                    })
                    .eq('id', participant.id);
            }
        } catch (mt5Error) {
            console.error('Failed to create MT5 account for competition join:', mt5Error);
            // We don't fail the join if MT5 fails, but we log it.
        }

        res.json(participant);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/competitions/admin - Admin list all
router.get('/admin', authenticate, async (req: any, res: Response) => {
    try {
        const { data, error } = await supabase
            .from('competitions')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/competitions/admin/trades/:challengeId - Admin fetch trades for a specific challenge
router.get('/admin/trades/:challengeId', authenticate, async (req: any, res: Response) => {
    try {
        const { challengeId } = req.params;

        const { data: trades, error } = await supabase
            .from('trades')
            .select('*')
            .eq('challenge_id', challengeId)
            .order('close_time', { ascending: false });

        if (error) throw error;
        res.json(trades);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/competitions/trades/:challengeId - Public fetch trades for a specific challenge (Leaderboard drill-down)
router.get('/trades/:challengeId', async (req, res) => {
    try {
        const { challengeId } = req.params;

        // Fetch trades for the challenge
        const { data: trades, error } = await supabase
            .from('trades')
            .select('*')
            .eq('challenge_id', challengeId)
            .order('close_time', { ascending: false })
            .gt('lots', 0);

        if (error) throw error;
        res.json(trades);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Simple In-Memory Cache for Competition Leaderboards
const leaderboardCache: Record<string, { data: any[], timestamp: number }> = {};
const CACHE_TTL = 30 * 1000; // 30 seconds

// GET /api/competitions/:id/leaderboard - Get competition leaderboard
router.get('/:id/leaderboard', async (req, res) => {
    try {
        const { id } = req.params;

        // Check Cache
        const cached = leaderboardCache[id];
        if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
            return res.json(cached.data);
        }

        // Fetch participants sorted by score/rank, including challenge_id
        const { data: participants, error } = await supabase
            .from('competition_participants')
            .select('user_id, score, rank, status, challenge_id')
            .eq('competition_id', id)
            .order('score', { ascending: false })
            .limit(100);

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
                .select('id, initial_balance, status')
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
            const gain = initialBalance > 0 ? (profit / initialBalance) * 100 : 0;

            // Prefer challenge status (e.g. 'failed') if available, otherwise participant status
            const effectiveStatus = challenge?.status || p.status;

            return {
                id: p.user_id,
                rank: index + 1,
                username: profile?.full_name || `Trader ${p.user_id.substring(0, 4)}...`,
                score: gain, // Use dynamic Gain % instead of DB score
                status: effectiveStatus,
                avatar_url: profile?.avatar_url,
                trades_count,
                profit,
                win_ratio,
                challenge_id: p.challenge_id
            };
        });

        // Update Cache
        leaderboardCache[id] = {
            data: leaderboard,
            timestamp: Date.now()
        };

        res.json(leaderboard);
    } catch (error: any) {
        console.error("Leaderboard error:", error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
