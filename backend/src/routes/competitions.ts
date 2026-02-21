import express, { Response } from 'express';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';
import { EmailService } from '../services/email-service';

import { supabase } from '../lib/supabase';

const router = express.Router();

// GET /api/competitions - List active/upcoming competitions

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.query.userId as string || req.user?.id;

        const { data, error } = await supabase
            .from('competitions')
            .select('*, participants:competition_participants(count)')
            .in('status', ['upcoming', 'active', 'ended', 'completed'])
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
router.post('/', authenticate, requireRole(['super_admin', 'admin']), async (req: AuthRequest, res: Response) => {
    try {
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
            .select('initial_balance, platform, title')
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
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': process.env.MT5_API_KEY || ''
                },
                body: JSON.stringify({
                    name: profile?.full_name || 'Trader',
                    email: profile?.email,
                    group: 'demo\\SF\\0-Demo\\comp', // Updated competition group as per user request
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
                        server: 'ALFX Limited', // Using updated server name
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

                // 5. Send Emails
                if (profile && profile.email) {
                    try {
                        // Competition Joined Email
                        await EmailService.sendCompetitionJoined(profile.email, profile.full_name || 'Trader', competition?.title || 'Shark Battle Ground');

                        // Account Credentials Email
                        await EmailService.sendAccountCredentials(
                            profile.email,
                            profile.full_name || 'Trader',
                            String(mt5Data.login),
                            mt5Data.password,
                            'ALFX Limited',
                            mt5Data.investor_password
                        );
                    } catch (emailErr) {
                        console.error("❌ Error sending competition emails:", emailErr);
                    }
                }
            } else {
                const errText = await bridgeResponse.text();
                console.error(`❌ MT5 Bridge Failed: ${bridgeResponse.status} ${bridgeResponse.statusText} - ${errText}`);
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

// POST /api/competitions/admin/assign-account - Admin manually assign account
router.post('/admin/assign-account', authenticate, requireRole(['super_admin', 'admin']), async (req: AuthRequest, res: Response) => {
    try {
        const { competitionId, login } = req.body;
        const DEBUG = process.env.DEBUG === 'true';
        if (DEBUG) console.log(`Manual Assignment: Linking account ${login} to competition ${competitionId}`);

        if (!competitionId || !login) {
            return res.status(400).json({ error: 'Competition ID and Login are required' });
        }

        // 1. Get Challenge by Login
        const { data: challenge, error: challengeError } = await supabase
            .from('challenges')
            .select('id, user_id, status')
            .eq('login', login)
            .single();

        if (challengeError || !challenge) {
            return res.status(404).json({ error: `Account ${login} not found in CRM` });
        }

        // 2. Check if already joined
        const { data: existingParticipant } = await supabase
            .from('competition_participants')
            .select('id')
            .eq('competition_id', competitionId)
            .eq('user_id', challenge.user_id)
            .single();

        if (existingParticipant) {
            return res.status(400).json({ error: 'User is already a participant in this competition' });
        }

        // 3. Update Challenge Metadata
        const { error: updateError } = await supabase
            .from('challenges')
            .update({
                challenge_type: 'Competition',
                metadata: { // Merge or overwrite metadata? Ideally merge, but simple insert for now
                    is_competition: true,
                    competition_id: competitionId,
                    joined_at: new Date().toISOString(),
                    assigned_by: req.user?.id
                }
            })
            .eq('id', challenge.id);

        if (updateError) {
            console.error("Error updating challenge:", updateError);
            return res.status(500).json({ error: 'Failed to update challenge metadata' });
        }

        // 4. Create Competition Participant
        const { error: insertError } = await supabase
            .from('competition_participants')
            .insert({
                competition_id: competitionId,
                user_id: challenge.user_id,
                challenge_id: challenge.id,
                status: 'active'
            });

        if (insertError) {
            console.error("Error inserting participant:", insertError);
            return res.status(500).json({ error: 'Failed to add participant record' });
        }

        if (DEBUG) console.log(`✅ Successfully assigned ${login} to competition ${competitionId}`);
        res.json({ message: 'Account assigned successfully', challenge_id: challenge.id });

    } catch (error: any) {
        console.error("Assign Account Error:", error);
        res.status(500).json({ error: error.message });
    }
});


// GET /api/competitions/admin - Admin list all
router.get('/admin', authenticate, requireRole(['super_admin', 'admin']), async (req: any, res: Response) => {
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
router.get('/admin/trades/:challengeId', authenticate, requireRole(['super_admin', 'admin']), async (req: any, res: Response) => {
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
router.get('/trades/:challengeId', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { challengeId } = req.params;
        const user = req.user;

        // Check if user owns the challenge OR if it's a competition challenge (semi-public)
        // For now, let's at least verify it's a competition challenge to allow public viewing
        const { data: challenge } = await supabase
            .from('challenges')
            .select('user_id, metadata')
            .eq('id', challengeId)
            .single();

        if (challenge?.user_id !== user.id && !challenge?.metadata?.is_competition) {
            return res.status(403).json({ error: "Access denied: Public trade viewing is only allowed for competitions." });
        }

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

// GET /api/competitions/:id/leaderboard - Get competition leaderboard
router.get('/:id/leaderboard', async (req, res) => {
    try {
        const { id } = req.params;
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
        const { getLeaderboard } = await import('../services/leaderboard-service');
        const leaderboard = await getLeaderboard(id, limit);
        res.json(leaderboard);
    } catch (error: any) {
        console.error("Leaderboard error:", error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
