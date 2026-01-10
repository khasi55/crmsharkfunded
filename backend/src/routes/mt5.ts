import { Router, Response, Request } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { supabase } from '../lib/supabase';
import { createMT5Account } from '../lib/mt5-bridge';

const router = Router();
// const MT5_BRIDGE_URL = process.env.MT5_BRIDGE_URL || 'http://localhost:8000';
const MT5_BRIDGE_URL = process.env.MT5_BRIDGE_URL || 'https://2b267220ca1b.ngrok-free.app';

// Helper function to generate random MT5 login (7-9 digits)
function generateMT5Login(): number {
    return Math.floor(10000000 + Math.random() * 900000000);
}

// Helper function to generate random password (8-12 characters)
function generatePassword(length = 10): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

// GET /api/mt5/accounts - List all MT5 accounts from unified table
router.get('/accounts', async (req: Request, res: Response) => {
    try {
        const { status, size, group, phase } = req.query;

        // 1. Fetch Challenges
        let query = supabase
            .from('challenges')
            .select('*');

        // Apply filters
        if (status && status !== 'all') {
            query = query.eq('status', status);
        }

        if (size && size !== 'all') {
            const accountSize = parseInt(size as string);
            query = query.eq('initial_balance', accountSize);
        }

        if (group && group !== 'all') {
            query = query.ilike('mt5_group', `%${group}%`);
        }

        if (phase && phase !== 'all') {
            // Note: DB uses 'Phase 1', 'Phase 2', 'Master Account'
            query = query.eq('challenge_type', phase === 'first' ? 'Phase 1' : phase === 'second' ? 'Phase 2' : 'Master Account');
        }

        const { data: challenges, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;

        // 2. Fetch Profiles Manually (Avoids FK dependency issues)
        let accountsWithProfiles = challenges || [];
        if (challenges && challenges.length > 0) {
            const userIds = Array.from(new Set(challenges.map((c: any) => c.user_id).filter(Boolean)));

            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name, email')
                .in('id', userIds);

            const profileMap = new Map(profiles?.map((p: any) => [p.id, p]));

            accountsWithProfiles = challenges.map((c: any) => ({
                ...c,
                profiles: profileMap.get(c.user_id) || { full_name: 'Unknown', email: 'No email' },
                plan_type: c.metadata?.plan_type || c.plan_type
            }));
        }

        res.json({ accounts: accountsWithProfiles, total: accountsWithProfiles.length });

    } catch (error: any) {
        console.error('MT5 accounts fetch error:', error);
        res.status(500).json({ error: 'Internal server error: ' + error.message });
    }
});

// POST /api/mt5/assign - Assign new MT5 account to user
router.post('/assign', async (req, res: Response) => {
    try {
        const { email, mt5Group, accountSize, planType } = req.body;

        // Validate required fields
        if (!email || !mt5Group || !accountSize || !planType) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }

        // 1. Find user by email
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, email, full_name')
            .eq('email', email)
            .single();

        if (profileError || !profile) {
            res.status(404).json({ error: 'User not found with this email' });
            return;
        }

        // 2. Determine challenge type and MT5 group
        let challengeType = 'Phase 1';
        let finalGroup = mt5Group;

        // Logic matched with payment webhook (frontend/app/api/webhooks/payment/route.ts)
        const lowerPlan = planType.toLowerCase();

        // 2a. Override group based on plan keywords (User Request)
        if (lowerPlan.includes('1 step') || lowerPlan.includes('1-step') ||
            lowerPlan.includes('2 step') || lowerPlan.includes('2-step') ||
            lowerPlan.includes('evaluation') || lowerPlan.includes('instant') ||
            lowerPlan.includes('rapid')) {
            finalGroup = 'demo\\Pro-Platinum';
        }

        if (lowerPlan.includes('pro')) {
            if (lowerPlan.includes('instant')) challengeType = 'prime_instant';
            else if (lowerPlan.includes('1 step') || lowerPlan.includes('1-step')) challengeType = 'prime_1_step';
            else if (lowerPlan.includes('2 step') || lowerPlan.includes('2-step')) challengeType = 'prime_2_step';
            else challengeType = 'prime_2_step';
        } else if (lowerPlan.includes('instant funding')) {
            challengeType = 'lite_instant';
            // Note: route.ts might default group here but we trust the input mt5Group
        } else if (lowerPlan.includes('1 step') || lowerPlan.includes('1-step')) {
            challengeType = 'lite_1_step';
        } else if (lowerPlan.includes('2 step') || lowerPlan.includes('2-step')) {
            challengeType = 'lite_2_step';
        } else if (lowerPlan.includes('funded') || lowerPlan.includes('master')) {
            challengeType = 'funded';
        } else {
            // Fallbacks
            if (lowerPlan.includes('evaluation')) challengeType = 'Evaluation';
            else if (lowerPlan.includes('instant')) challengeType = 'Instant';
        }

        // 3. Call Python MT5 Bridge to create account
        const callbackUrl = `${process.env.BACKEND_URL || process.env.FRONTEND_URL}/api/webhooks/mt5`;

        const mt5Data = await createMT5Account({
            name: profile.full_name || 'Trader',
            email: profile.email,
            group: finalGroup,
            leverage: 100,
            balance: accountSize,
            callback_url: callbackUrl
        });

        const mt5Login = mt5Data.login;
        const masterPassword = mt5Data.password;
        const investorPassword = mt5Data.investor_password;

        console.log(`📝 [MT5 Assign] Inserting challenge: Login=${mt5Login}, Size=${accountSize}, SOD=${accountSize}`);

        // 4. Create unified challenge record
        const { data: challenge, error: challengeError } = await supabase
            .from('challenges')
            .insert({
                user_id: profile.id,
                initial_balance: accountSize,
                current_balance: accountSize,
                current_equity: accountSize,
                start_of_day_equity: accountSize,
                login: mt5Login,
                master_password: masterPassword,
                investor_password: investorPassword,
                server: 'Mazi Finance',
                platform: 'MT5',
                leverage: 100,
                status: 'active',
                challenge_type: challengeType,
                metadata: {
                    plan_type: planType,
                    assigned_via: 'admin_manual'
                }
            })
            .select()
            .single();

        if (challengeError) {
            console.error('Challenge creation error:', challengeError);
            res.status(500).json({ error: 'Failed to create account: ' + challengeError.message });
            return;
        }

        // 5. Send email with credentials (asynchronously - fire and forget)
        // We don't await this so the UI response is instant
        fetch(process.env.API_URL + '/api/email/send-account-credentials', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: profile.email,
                name: profile.full_name || 'Trader',
                accountSize: accountSize,
                login: mt5Login,
                masterPassword: masterPassword,
                investorPassword: investorPassword,
                server: 'Mazi Finance',
                mt5Group: mt5Group,
                planType: planType,
            }),
        }).catch(emailError => {
            console.error('Email sending failed (async):', emailError);
        });

        res.json({
            success: true,
            message: 'Account assigned successfully',
            account: {
                id: challenge.id,
                login: mt5Login,
                accountSize: accountSize,
                planType: planType,
            },
        });

    } catch (error: any) {
        console.error('MT5 assign error:', error);
        res.status(500).json({ error: 'Internal server error: ' + error.message });
    }
});

// POST /api/mt5/sync-trades - Manually trigger trade sync from Bridge
router.post('/sync-trades', async (req: Request, res: Response) => {
    try {
        const { login, user_id } = req.body;

        if (!login) {
            res.status(400).json({ error: 'Missing login' });
            return;
        }

        console.log(`🔄 Syncing trades for account ${login}...`);

        // 1. Fetch trades from Python Bridge (should include both open and closed)
        const { fetchMT5Trades } = await import('../lib/mt5-bridge');
        const allTrades = await fetchMT5Trades(login);

        console.log(`📦 Bridge returned ${allTrades.length} trades`);

        // Debug: Show sample trade structure
        if (allTrades.length > 0) {
            console.log('📊 Sample trade structure:', JSON.stringify(allTrades[0], null, 2));
            // Log ALL open trades to see why they might be failing
            const openTrades = allTrades.filter((t: any) => !t.close_time && !t.is_closed);
            console.log(`🔎 Found ${openTrades.length} OPEN trades in bridge response.`);
            if (openTrades.length > 0) {
                console.log('   Sample OPEN trade:', JSON.stringify(openTrades[0], null, 2));
            }
        }

        if (!allTrades || allTrades.length === 0) {
            res.json({ success: true, count: 0, message: 'No trades found' });
            return;
        }

        // 2. Fetch Challenge ID and User ID
        const { data: challenge, error: challengeError } = await supabase
            .from('challenges')
            .select('id, user_id')
            .eq('login', login)
            .single();

        if (challengeError || !challenge) {
            console.error('Challenge lookup failed for login:', login);
            res.status(404).json({ error: 'Challenge not found for this login' });
            return;
        }

        // 3. Format Trades
        const formattedTrades = allTrades.map((t: any) => ({
            ticket: t.ticket,
            challenge_id: challenge.id,
            user_id: challenge.user_id,
            symbol: t.symbol,
            type: t.type === 0 ? 'buy' : t.type === 1 ? 'sell' : 'balance',
            lots: t.volume / 10000,
            open_price: t.price,
            close_price: t.close_price || null,
            profit_loss: t.profit,
            open_time: new Date(t.time * 1000).toISOString(),
            close_time: t.close_time ? new Date(t.close_time * 1000).toISOString() : null,
            commission: t.commission,
            swap: t.swap,
        }));

        // 4. Deduplicate by composite key (challenge_id + ticket)
        // Keep only the latest occurrence of each unique trade
        const uniqueTrades = Array.from(
            formattedTrades.reduce((map: Map<string, any>, trade: any) => {
                const key = `${trade.challenge_id}-${trade.ticket}`;
                map.set(key, trade); // Later entries will overwrite earlier ones
                return map;
            }, new Map()).values()
        );

        // Debug: Check formatted open trades
        const formattedOpen = uniqueTrades.filter((t: any) => t.close_time === null);
        console.log(`📝 Formatted ${formattedOpen.length} trades as OPEN (close_time=null).`);
        if (formattedOpen.length > 0) {
            console.log('   Sample Formatted OPEN:', formattedOpen[0]);
        }

        console.log(`💾 Upserting ${uniqueTrades.length} unique trades (${formattedTrades.length - uniqueTrades.length} duplicates removed)`);

        // 5. Upsert - update existing trades (deduplication prevents batch errors)
        const { error } = await supabase.from('trades').upsert(
            uniqueTrades,
            { onConflict: 'challenge_id, ticket' }
        );

        if (error) {
            console.error('Database sync error:', error);
            res.status(500).json({ error: 'Failed to save trades to database: ' + error.message });
            return;
        }

        res.json({ success: true, count: allTrades.length, trades: formattedTrades });

    } catch (error: any) {
        console.error('Sync error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ---------------- ADMIN ACTIONS ----------------

// POST /api/mt5/admin/disable
router.post('/admin/disable', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { login } = req.body;

        // TODO: Add stricter admin role check here if needed
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        console.log(`🔌 Admin Request: Disable account ${login} using Bridge: ${MT5_BRIDGE_URL}`);

        const response = await fetch(`${MT5_BRIDGE_URL}/disable-account`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ login: Number(login) })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error(`❌ Bridge Error (${response.status}):`, errText);
            throw new Error(`Bridge error: ${errText}`);
        }

        const result = await response.json();

        // Update local DB status to match
        const { error: dbError } = await supabase
            .from('challenges')
            .update({ status: 'failed' }) // Or 'banned' / 'disabled'
            .eq('login', login);

        if (dbError) console.error('Failed to update DB status:', dbError);

        res.json(result);
    } catch (error) {
        console.error('Admin Disable Error:', error);
        res.status(500).json({ error: 'Failed to disable account' });
    }
});

// POST /api/mt5/admin/stop-out
router.post('/admin/stop-out', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { login } = req.body;

        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        console.log(`🔌 Admin Request: Stop Out account ${login} using Bridge: ${MT5_BRIDGE_URL}`);

        const response = await fetch(`${MT5_BRIDGE_URL}/stop-out-account`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ login: Number(login) })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error(`❌ Bridge Error (${response.status}):`, errText);
            throw new Error(`Bridge error: ${errText}`);
        }

        const result = await response.json();

        // Update local DB status
        await supabase
            .from('challenges')
            .update({ status: 'failed' })
            .eq('login', login);

        res.json(result);
    } catch (error) {
        console.error('Admin Stop Out Error:', error);
        res.status(500).json({ error: 'Failed to stop out account' });
    }
});

export default router;
