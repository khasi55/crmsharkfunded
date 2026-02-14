import { Router, Response, Request } from 'express';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';
import { supabase } from '../lib/supabase';
import {
    createMT5Account,
    fetchMT5Trades,
    fetchMT5History,
    disableMT5Account,
    adjustMT5Balance,
    changeMT5Leverage,
    enableMT5Account,
    stopOutMT5Account
} from '../lib/mt5-bridge';
import { EmailService } from '../services/email-service';
import { AuditLogger } from '../lib/audit-logger';
import { validateRequest, mt5AssignSchema, mt5BalanceAdjustSchema, mt5LeverageChangeSchema } from '../middleware/validation';
import { sensitiveLimiter, resourceIntensiveLimiter } from '../middleware/rate-limit';
import { logSecurityEvent } from '../utils/security-logger';

const router = Router();
// const MT5_BRIDGE_URL = process.env.MT5_BRIDGE_URL || 'http://localhost:8000';
const MT5_BRIDGE_URL = process.env.MT5_BRIDGE_URL || 'https://bridge.sharkfunded.co';

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

// GET /api/mt5/accounts - List all MT5 accounts from unified table (admin only)
router.get('/accounts', authenticate, requireRole(['super_admin', 'admin']), async (req: AuthRequest, res: Response) => {
    try {
        const { status, size, group, phase, login } = req.query;

        // 1. Fetch Challenges
        let query = supabase
            .from('challenges')
            .select('*');

        // Apply filters
        if (login) {
            query = query.eq('login', login);
        }
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

            const challengeIds = challenges.map((c: any) => c.id);
            // Extract order_ids from metadata (legacy/website created)
            const orderIds = challenges
                .map((c: any) => c.metadata?.order_id)
                .filter((id: any) => typeof id === 'string' && id.startsWith('SF-'));

            // Fetch orders by challenge_id OR order_id
            let orders: any[] = [];

            // 1. Fetch by linked challenge_id
            const { data: linkedOrders } = await supabase
                .from('payment_orders')
                .select('challenge_id, order_id, payment_gateway, payment_method')
                .in('challenge_id', challengeIds);

            orders = linkedOrders || [];

            // 2. Fetch by metadata order_id (if needed)
            if (orderIds.length > 0) {
                const { data: metaOrders } = await supabase
                    .from('payment_orders')
                    .select('challenge_id, order_id, payment_gateway, payment_method')
                    .in('order_id', orderIds);

                // Merge avoiding duplicates if possible, though strict dedupe isn't critical for map
                if (metaOrders) {
                    orders = [...orders, ...metaOrders];
                }
            }

            // Deduplicate and Map
            const orderMap = new Map();
            orders.forEach((o: any) => {
                if (o.challenge_id) orderMap.set(o.challenge_id, o); // Primary Link
                if (o.order_id) orderMap.set(o.order_id, o);         // Secondary Link (Metadata key)
            });

            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name, email')
                .in('id', userIds);

            const profileMap = new Map(profiles?.map((p: any) => [p.id, p]));

            accountsWithProfiles = challenges.map((c: any) => {
                // Try to find order by challenge ID first, then by metadata order_id
                let order = orderMap.get(c.id);
                if (!order && c.metadata?.order_id) {
                    order = orderMap.get(c.metadata.order_id);
                }

                // Merge payment metadata if exists
                const metadata = c.metadata || {};

                if (order) {
                    metadata.payment_provider = order.payment_gateway; // e.g. 'sharkpay'
                    metadata.payment_method = order.payment_method;     // e.g. 'upi'
                }

                return {
                    ...c,
                    profiles: profileMap.get(c.user_id) || { full_name: 'Unknown', email: 'No email' },
                    plan_type: metadata.plan_type || c.plan_type,
                    metadata: metadata
                };
            });
        }

        res.json({ accounts: accountsWithProfiles, total: accountsWithProfiles.length });

    } catch (error: any) {
        console.error('MT5 accounts fetch error:', error);
        res.status(500).json({ error: 'Internal server error: ' + error.message });
    }
});

// POST /api/mt5/assign - Assign new MT5 account to user (admin only)
router.post('/assign', authenticate, requireRole(['super_admin', 'admin']), resourceIntensiveLimiter, validateRequest(mt5AssignSchema), async (req: AuthRequest, res: Response) => {
    try {
        const { email, mt5Group, accountSize, planType, note, imageUrl, competitionId } = req.body;

        // Validate Competition ID if applicable
        if (planType === 'Competition Account' && !competitionId) {
            res.status(400).json({ error: 'Competition ID is required for Competition Accounts' });
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

        // Logic matched with payment webhook
        const lowerPlan = planType.toLowerCase();

        if (lowerPlan.includes('pro') || lowerPlan.includes('prime')) {
            if (lowerPlan.includes('instant')) challengeType = 'prime_instant';
            else if (lowerPlan.includes('1 step') || lowerPlan.includes('1-step')) challengeType = 'prime_1_step';
            else if (lowerPlan.includes('2 step') || lowerPlan.includes('2-step')) challengeType = 'prime_2_step';
            else challengeType = 'prime_2_step';
        } else if (lowerPlan.includes('instant funding') || lowerPlan.includes('instant')) {
            challengeType = 'lite_instant';
        } else if (lowerPlan.includes('1 step') || lowerPlan.includes('1-step')) {
            challengeType = 'lite_1_step';
        } else if (lowerPlan.includes('2 step') || lowerPlan.includes('2-step')) {
            challengeType = 'lite_2_step';
        } else if (lowerPlan.includes('funded') || lowerPlan.includes('master')) {
            challengeType = 'funded';
        } else if (lowerPlan.includes('competition') || lowerPlan.includes('battle')) {
            challengeType = 'Competition';
        } else {
            // Fallbacks
            if (lowerPlan.includes('evaluation')) challengeType = 'Evaluation';
            else {
                // Secondary check for Prime if not caught above
                challengeType = lowerPlan.includes('prime') ? 'prime_2_step' : 'Phase 1';
            }
        }
        // 3. Call Python MT5 Bridge to create account
        const callbackUrl = `${process.env.BACKEND_URL || process.env.FRONTEND_URL}/api/mt5/trades/webhook`;

        // console.log(`🔌 [MT5 Assign] Attempting to real create account in group: '${finalGroup}' for ${email}`);
        // console.log(`🔌 [MT5 Assign] Payload:`, JSON.stringify({...}));

        let mt5Data;
        try {
            mt5Data = await createMT5Account({
                name: profile.full_name || 'Trader',
                email: profile.email,
                group: finalGroup,
                leverage: 100,
                balance: accountSize,
                callback_url: callbackUrl
            }) as any;
            // console.log(`✅ [MT5 Assign] Bridge Response:`, JSON.stringify(mt5Data, null, 2));
        } catch (bridgeError: any) {
            console.error(`❌ [MT5 Assign] Bridge Call Failed:`, bridgeError);
            console.error(`❌ [MT5 Assign] Bridge Error Details:`, bridgeError.message);
            if (bridgeError.cause) console.error(`❌ [MT5 Assign] Cause:`, bridgeError.cause);
            throw new Error(`Bridge Account Creation Failed: ${bridgeError.message}`);
        }

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
                server: 'ALFX Limited',
                platform: 'MT5',
                group: finalGroup, // Save the assigned group
                leverage: 100,
                status: 'active',
                challenge_type: challengeType,
                metadata: {
                    plan_type: planType,
                    assigned_via: 'admin_manual',
                    assignment_note: note,
                    assignment_image_url: imageUrl,
                    is_competition: !!competitionId,
                    competition_id: competitionId
                }
            })
            .select()
            .single();

        if (challengeError) {
            console.error('Challenge creation error:', challengeError);
            res.status(500).json({ error: 'Failed to create account: ' + challengeError.message });
            return;
        }

        // 4.5. If Competition, Link Participant
        if (competitionId) {
            const { error: partError } = await supabase
                .from('competition_participants')
                .upsert({
                    competition_id: competitionId,
                    user_id: profile.id,
                    challenge_id: challenge.id,
                    status: 'active'
                }, { onConflict: 'competition_id, user_id' });

            if (partError) {
                console.error("Failed to link competition participant:", partError);
                // Non-fatal, but log it.
            } else {
                console.log(`✅ User ${profile.email} linked to competition ${competitionId}`);
            }
        }

        // 5. Send email with credentials (asynchronously)
        // We don't await this so the UI response is instant, but we use the service directly now
        if (profile.email) {
            EmailService.sendAccountCredentials(
                profile.email,
                profile.full_name || 'Trader',
                String(mt5Login),
                masterPassword,
                'ALFX Limited',
                investorPassword
            ).catch(err => console.error("Async Email Error:", err));
        }

        // 6. Log Admin Action
        await logSecurityEvent({
            userId: req.user!.id,
            email: req.user!.email,
            action: 'MT5_ACCOUNT_ASSIGN',
            resource: 'mt5',
            resourceId: String(mt5Login),
            payload: { login: mt5Login, email: profile.email, plan: planType },
            status: 'success',
            ip: req.ip
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

// POST /api/mt5/sync-trades - Manually trigger trade sync from Bridge (admin only)
router.post('/sync-trades', authenticate, requireRole(['super_admin', 'admin']), async (req: AuthRequest, res: Response) => {
    try {
        const { login, user_id } = req.body;

        if (!login) {
            res.status(400).json({ error: 'Missing login' });
            return;
        }

        console.log(`🔄 Syncing trades for account ${login}...`);

        // 1. Fetch trades from Python Bridge (should include both open and closed)
        const { fetchMT5Trades, fetchMT5History } = await import('../lib/mt5-bridge');

        // Single Fetch: Get both active and recent history trades in one call
        const oneDayAgo = Math.floor(Date.now() / 1000) - 86400;
        const allTrades = await fetchMT5History(login, oneDayAgo);

        console.log(`📦 Bridge returned ${allTrades.length} trades (Active + History)`);

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
            type: (() => {
                let tType = t.type === 0 ? 'buy' : t.type === 1 ? 'sell' : 'balance'; // Default mapping (Standard MT5: 0=Buy, 1=Sell)

                // Override with Price Action Inference
                const profit = Number(t.profit);
                const openPrice = Number(t.price);
                const closePrice = t.close_price ? Number(t.close_price) : Number(t.current_price || t.price);

                if (openPrice > 0 && closePrice > 0 && Math.abs(profit) > 0.0001) {
                    const priceDelta = closePrice - openPrice;
                    if (profit > 0) {
                        if (priceDelta > 0) tType = 'buy';
                        else if (priceDelta < 0) tType = 'sell';
                    } else {
                        if (priceDelta > 0) tType = 'sell';
                        else if (priceDelta < 0) tType = 'buy';
                    }
                }
                return tType;
            })(),
            lots: t.volume / 100,
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

        // --- CACHE INVALIDATION ---
        try {
            const { getRedis } = await import('../lib/redis');
            const redis = getRedis();
            await redis.del(`dashboard:bulk:${challenge.id}`);
        } catch (err) {
            console.error('Redis cache invalidation error:', err);
        }

        // --- RECONCILIATION STEP ---
        // Identify trades that are Open in DB but missing from Bridge (meaning they closed)
        const bridgeTickets = new Set(allTrades.map((t: any) => Number(t.ticket)));

        // Fetch all currently OPEN trades from DB
        const { data: dbOpenTrades } = await supabase
            .from('trades')
            .select('id, ticket')
            .eq('challenge_id', challenge.id)
            .is('close_time', null);

        if (dbOpenTrades && dbOpenTrades.length > 0) {
            const tradesToClose = dbOpenTrades.filter(t => !bridgeTickets.has(t.ticket));

            if (tradesToClose.length > 0) {
                console.log(`🧹 Auto-closing ${tradesToClose.length} trades not found in bridge...`);

                const ticketIdsToClose = tradesToClose.map(t => t.id);
                const { error: closeError } = await supabase
                    .from('trades')
                    .update({
                        close_time: new Date().toISOString(),
                        // We assume close_price is unknown, sticking to last known or null. 
                        // ideally we'd fetch history but endpoint is broken.
                    })
                    .in('id', ticketIdsToClose);

                if (closeError) {
                    console.error("Failed to auto-close trades:", closeError);
                } else {
                    console.log(`✅ Closed ${tradesToClose.length} stale trades.`);
                }
            }
        }

        // 6. Notify Risk Engine (FIX: Send RAW trades)
        if (allTrades.length > 0) {
            const { getRedis } = await import('../lib/redis');
            const eventPayload = {
                login: Number(login),
                trades: allTrades, // RAW TRADES for duration checks
                timestamp: Date.now()
            };
            await getRedis().publish('events:trade_update', JSON.stringify(eventPayload));
            console.log(`📢 [Manual Sync] Triggered Risk Engine for ${login}`);
        }

        res.json({ success: true, count: allTrades.length, trades: formattedTrades });

        // 7. Log Admin Action
        const { AuditLogger } = await import('../lib/audit-logger');
        AuditLogger.info(req.user.email, `Manually Triggered Trade Sync: ${login}`, { login: Number(login), count: allTrades.length });

    } catch (error: any) {
        console.error('Sync error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ---------------- ADMIN ACTIONS ----------------

// POST /api/mt5/admin/disable
// POST /api/mt5/admin/disable - Disable MT5 account (admin only)
router.post('/admin/disable', authenticate, requireRole(['super_admin', 'admin', 'risk_admin']), sensitiveLimiter, async (req: AuthRequest, res: Response) => {
    try {
        const { login } = req.body;

        // TODO: Add stricter admin role check here if needed
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // 1. Call Bridge
        const result = await disableMT5Account(Number(login));

        // 2. Parallelize Audit Logging and DB Updates
        Promise.all([
            logSecurityEvent({
                userId: req.user.id,
                email: req.user.email,
                action: 'MT5_ACCOUNT_DISABLE',
                resource: 'mt5',
                resourceId: String(login),
                payload: { login, bridge_response: result },
                status: 'success',
                ip: req.ip
            }),
            supabase.from('challenges').update({ status: 'disabled' }).eq('login', login)
        ]).catch(err => console.error('Post-Disable Sync Error:', err));

        res.json(result);
    } catch (error) {
        console.error('Admin Disable Error:', error);
        res.status(500).json({ error: 'Failed to disable account' });
    }
});

// POST /api/mt5/admin/stop-out
// POST /api/mt5/admin/stop-out - Stop out MT5 account (admin only)
router.post('/admin/stop-out', authenticate, requireRole(['super_admin', 'admin', 'risk_admin']), sensitiveLimiter, async (req: AuthRequest, res: Response) => {
    try {
        const { login } = req.body;

        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // 1. Call Bridge
        const result = await stopOutMT5Account(Number(login));

        // 2. Parallelize Audit Logging and DB Updates
        Promise.all([
            logSecurityEvent({
                userId: req.user.id,
                email: req.user.email,
                action: 'MT5_ACCOUNT_STOP_OUT',
                resource: 'mt5',
                resourceId: String(login),
                payload: { login, bridge_response: result },
                status: 'success',
                ip: req.ip
            }),
            supabase.from('challenges').update({ status: 'breached', breached_at: new Date().toISOString() }).eq('login', login)
        ]).catch(err => console.error('Post-Stopout Sync Error:', err));

        res.json(result);
    } catch (error) {
        console.error('Admin Stop Out Error:', error);
        res.status(500).json({ error: 'Failed to stop out account' });
    }
});

// POST /api/mt5/admin/enable
// POST /api/mt5/admin/enable - Enable MT5 account (admin only)
router.post('/admin/enable', authenticate, requireRole(['super_admin', 'admin', 'risk_admin']), sensitiveLimiter, async (req: AuthRequest, res: Response) => {
    try {
        const { login } = req.body;

        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const start = Date.now();
        console.log(`🔌 [Enable] Starting for ${login}`);

        // 1. Call Bridge
        const bridgeStart = Date.now();
        const result = await enableMT5Account(Number(login));
        console.log(`⏱️ [Enable] Bridge took ${Date.now() - bridgeStart}ms`);

        // 2. Log Admin Action
        await logSecurityEvent({
            userId: req.user.id,
            email: req.user.email,
            action: 'MT5_ACCOUNT_ENABLE',
            resource: 'mt5',
            resourceId: String(login),
            payload: { login, bridge_response: result },
            status: 'success',
            ip: req.ip
        });

        // 3. Update local DB status
        const dbStart = Date.now();
        await supabase.from('challenges').update({ status: 'active' }).eq('login', login);
        console.log(`⏱️ [Enable] DB took ${Date.now() - dbStart}ms`);

        console.log(`✅ [Enable] Finished in ${Date.now() - start}ms`);
        res.json(result);
    } catch (error: any) {
        console.error('Admin Enable Error:', error);
        res.status(500).json({
            error: 'Failed to enable account',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// POST /api/mt5/admin/change-leverage - Change MT5 account leverage (admin only)
router.post('/admin/change-leverage', authenticate, requireRole(['super_admin', 'admin', 'risk_admin']), sensitiveLimiter, validateRequest(mt5LeverageChangeSchema), async (req: AuthRequest, res: Response) => {
    try {
        const { login, leverage } = req.body;

        if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
        if (!login || !leverage) return res.status(400).json({ error: 'Missing login or leverage' });

        // 1. Call Bridge
        const result = await changeMT5Leverage(Number(login), Number(leverage));

        // 2. Parallelize Audit Logging and DB Updates
        Promise.all([
            logSecurityEvent({
                userId: req.user.id,
                email: req.user.email,
                action: 'MT5_LEVERAGE_CHANGE',
                resource: 'mt5',
                resourceId: String(login),
                payload: { login, leverage, result },
                status: 'success',
                ip: req.ip
            }),
            supabase.from('challenges').update({ leverage: Number(leverage) }).eq('login', login)
        ]).catch(err => console.error('Post-Leverage Sync Error:', err));

        res.json(result);
    } catch (error: any) {
        console.error('Admin Leverage Change Error:', error);
        res.status(500).json({ error: error.message || 'Failed to change leverage' });
    }
});

// POST /api/mt5/admin/adjust-balance - Adjust MT5 balance (admin only)
router.post('/admin/adjust-balance', authenticate, requireRole(['super_admin', 'admin', 'risk_admin']), sensitiveLimiter, validateRequest(mt5BalanceAdjustSchema), async (req: AuthRequest, res: Response) => {
    try {
        const { login, amount, comment } = req.body;

        if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
        if (!login || amount === undefined) return res.status(400).json({ error: 'Missing login or amount' });

        // 1. Call Bridge
        const result = await adjustMT5Balance(Number(login), Number(amount), comment || 'Admin Adjustment');

        // 2. Parallelize Audit Logging and DB Updates
        (async () => {
            try {
                // Fetch current to update
                const { data: challenge } = await supabase
                    .from('challenges')
                    .select('current_balance, current_equity')
                    .eq('login', login)
                    .single();

                if (challenge) {
                    await supabase
                        .from('challenges')
                        .update({
                            current_balance: Number(challenge.current_balance) + Number(amount),
                            current_equity: Number(challenge.current_equity) + Number(amount),
                            updated_at: new Date().toISOString()
                        })
                        .eq('login', login);
                }
                await logSecurityEvent({
                    userId: req.user!.id,
                    email: req.user!.email,
                    action: 'MT5_BALANCE_ADJUST',
                    resource: 'mt5',
                    resourceId: String(login),
                    payload: { login, amount, comment, result },
                    status: 'success',
                    ip: req.ip
                });
            } catch (err) {
                console.error('Post-Balance Sync Error:', err);
            }
        })();

        res.json(result);
    } catch (error: any) {
        console.error('Admin Balance Adjust Error:', error);
        res.status(500).json({ error: error.message || 'Failed to adjust balance' });
    }
});

// POST /api/mt5/trades/webhook - Receive closed trades (Poller OR Event)
router.post('/trades/webhook', async (req: Request, res: Response) => {
    try {
        const secret = req.headers['x-webhook-secret'];
        if (secret !== process.env.MT5_WEBHOOK_SECRET) {
            console.warn(`[Security] Unauthorized trade webhook attempt with invalid secret.`);
            return res.status(401).json({ error: 'Unauthorized: Invalid webhook secret' });
        }

        const body = req.body;
        // console.log(`📊 [Backend] Received Webhook Payload:`, JSON.stringify(body, null, 2));

        // --- SCHEME C: NEW BATCH EVENT (Production Scale) ---
        if (body.event === 'trades_closed_batch') {
            const { trades, count } = body;
            console.log(`📦 [Backend] Received Batch of ${count} trades`);

            if (!trades || !Array.isArray(trades) || trades.length === 0) {
                res.json({ processed: 0 });
                return;
            }

            // 1. Bulk Fetch Challenges
            const uniqueLogins = Array.from(new Set(trades.map((t: any) => t.login)));
            const { data: challenges } = await supabase
                .from('challenges')
                .select('id, user_id, login, created_at')
                .in('login', uniqueLogins)
                .eq('status', 'active');

            if (!challenges || challenges.length === 0) {
                console.warn(`No active challenges found for batch logins: ${uniqueLogins.join(', ')}`);
                res.json({ processed: 0, reason: 'no_challenges' });
                return;
            }

            const challengeMap = new Map(challenges.map(c => [c.login, c]));

            // 2. Prepare Trades for DB
            const validTrades = trades.map((t: any) => {
                const challenge = challengeMap.get(t.login);
                if (!challenge) return null;

                // GHOST TRADE PROTECTION
                // Ignore trades older than challenge creation prevents historical import
                const challengeStartTime = new Date(challenge.created_at).getTime();
                const tradeTime = new Date(t.timestamp || t.close_time).getTime();

                // Allow 60s buffer
                if (tradeTime < (challengeStartTime - 60000)) {
                    // console.log(`👻 Skipped Ghost Trade ${t.ticket} (Time ${t.timestamp} < Created ${challenge.created_at})`);
                    return null;
                }

                return {
                    challenge_id: challenge.id,
                    user_id: challenge.user_id,
                    ticket: Number(t.ticket),
                    symbol: t.symbol,
                    type: (() => {
                        let tType = t.type === 0 ? 'buy' : t.type === 1 ? 'sell' : 'balance';
                        const profit = Number(t.profit);
                        const openPrice = Number(t.open_price || 0);
                        const closePrice = t.close_price ? Number(t.close_price) : 0;

                        if (openPrice > 0 && closePrice > 0 && Math.abs(profit) > 0.0001) {
                            const priceDelta = closePrice - openPrice;
                            if (profit > 0) {
                                if (priceDelta > 0) tType = 'buy';
                                else if (priceDelta < 0) tType = 'sell';
                            } else {
                                if (priceDelta > 0) tType = 'sell';
                                else if (priceDelta < 0) tType = 'buy';
                            }
                        }
                        return tType;
                    })(),
                    lots: t.volume / 100,
                    open_price: t.open_price || 0,
                    close_price: t.close_price,
                    profit_loss: t.profit,
                    swap: t.swap || 0,
                    commission: t.commission || 0,
                    open_time: t.open_time ? new Date(t.open_time * 1000).toISOString() : new Date().toISOString(),
                    close_time: t.close_time ? new Date(t.close_time).toISOString() : new Date().toISOString(),
                };
            }).filter(Boolean);

            if (validTrades.length > 0) {
                // Deduplicate
                const uniqueTrades = Array.from(
                    validTrades.reduce((map: Map<string, any>, trade: any) => {
                        const key = `${trade.challenge_id}-${trade.ticket}`;
                        map.set(key, trade);
                        return map;
                    }, new Map()).values()
                );

                // 3. Bulk Upsert
                const { error } = await supabase
                    .from('trades')
                    .upsert(uniqueTrades, { onConflict: 'challenge_id, ticket' });

                if (error) {
                    console.error('❌ Batch Upsert Failed:', error);
                    res.status(500).json({ error: error.message });
                    return;
                }

                console.log(`✅ Successfully upserted ${validTrades.length} trades from batch.`);

                // Cache Invalidation for all challenges in batch
                try {
                    const { getRedis } = await import('../lib/redis');
                    const redis = getRedis();
                    const challengesToInvalidate = Array.from(new Set(validTrades.map((t: any) => t.challenge_id)));
                    await Promise.all(challengesToInvalidate.map(cid => redis.del(`dashboard:bulk:${cid}`)));
                } catch (err) {
                    console.error('Batch cache invalidation error:', err);
                }

                // WebSocket: Broadcast trade updates to affected users (filter ensures non-null)
                const { broadcastTradeUpdate } = await import('../services/socket');
                // validTrades is already filtered from null in line 477
                (validTrades as any[]).forEach(trade => {
                    broadcastTradeUpdate(trade.challenge_id, {
                        type: 'new_trade',
                        trade: trade
                    });
                });
            }

            res.json({ success: true, processed: validTrades.length });
            return;
        }

        // --- SCHEME A: NEW SINGLE EVENT (User Request) ---
        if (body.event === 'trade_closed' || body.event === 'trade_opened') {
            const { login, ticket, symbol, price, profit, type, volume, time } = body;

            if (!login || !ticket) {
                res.status(400).json({ error: 'Missing login or ticket' });
                return;
            }

            // 1. Find Challenge
            const { data: challenge, error } = await supabase
                .from('challenges')
                .select('*')
                .eq('login', login)
                .single();

            if (!challenge) {
                console.warn(`Challenge not found for login ${login}`);
                res.status(404).json({ error: 'Challenge not found' });
                return;
            }

            if (body.event === 'trade_opened') {
                // User requested to IGNORE open trades and only process closed.
                console.log(`Open Trade Event (Ignored): ${ticket} for ${login}`);
                res.json({ success: true, status: 'opened_ignored' });
                return;
            }

            // 2. Manual Check for Existence (since upsert constraints are missing)
            const { data: existingTrade } = await supabase
                .from('trades')
                .select('id')
                .eq('challenge_id', challenge.id)
                .eq('ticket', Number(ticket))
                .single();

            const tradeData = {
                challenge_id: challenge.id,
                user_id: challenge.user_id,
                ticket: Number(ticket),
                symbol: symbol,
                type: type,
                lots: volume,
                open_price: 0,
                close_price: price,
                profit_loss: profit,
                close_time: new Date().toISOString(),
            };

            let insertError;
            if (existingTrade) {
                const { error } = await supabase
                    .from('trades')
                    .update(tradeData)
                    .eq('id', existingTrade.id);
                insertError = error;
            } else {
                const { error } = await supabase
                    .from('trades')
                    .insert(tradeData);
                insertError = error;
            }

            if (insertError) {
                console.error('Failed to insert trade:', insertError);
                res.status(500).json({ error: insertError.message });
                return;
            }

            console.log(`✅ Trade ${ticket} saved via Event webhook.`);

            // WebSocket: Broadcast trade update
            const { broadcastTradeUpdate } = await import('../services/socket');
            broadcastTradeUpdate(challenge.id, {
                type: 'new_trade',
                trade: tradeData
            });

            res.json({ success: true });
            return;
        }

        // --- SCHEME B: LEGACY ARRAY (Poller) ---
        const { login, trades } = body;

        if (!trades || !Array.isArray(trades) || trades.length === 0) {
            res.json({ processed: 0 });
            return;
        }

        // ... (Existing Logic for Array)
        // 1. Find challenge by MT5 login
        const { data: challenge, error } = await supabase
            .from('challenges')
            .select('*')
            .eq('login', login)
            .eq('status', 'active')
            .single();

        if (!challenge) {
            console.warn(`Challenge not found or not active for login ${login}`);
            res.status(404).json({ error: 'Challenge not found' });
            return;
        }

        // 2. Save trades to database
        const newTradesPayload = trades.map((trade: any) => ({
            challenge_id: challenge.id,
            user_id: challenge.user_id,
            symbol: trade.symbol,
            ticket: Number(trade.ticket),
            type: trade.type === 0 ? 'sell' : trade.type === 1 ? 'buy' : 'balance',
            lots: trade.volume / 100,
            open_price: trade.price,
            close_price: trade.close_price,
            profit: trade.profit,
            commission: trade.commission,
            swap: trade.swap,
            open_time: new Date(trade.time * 1000).toISOString(),
            close_time: trade.close_time ? new Date(trade.close_time * 1000).toISOString() : new Date().toISOString(),
            is_closed: true
        }));

        // Upsert
        const { error: insertError } = await supabase
            .from('trades')
            .upsert(newTradesPayload, { onConflict: 'ticket', ignoreDuplicates: true });

        if (insertError) {
            console.error('Failed to insert trades:', insertError);
        }

        // 3. Update Challenge Stats (Calculations)
        const totalProfit = trades.reduce((sum: number, t: any) => sum + (t.profit || 0) + (t.swap || 0) + (t.commission || 0), 0);

        // Try RPC first for atomic increment
        const { error: rpcError } = await supabase.rpc('increment_challenge_stats', {
            p_challenge_id: challenge.id,
            p_trades_count: trades.length,
            p_profit_add: totalProfit
        });

        if (rpcError) {
            // Fallback: Simple update
            await supabase
                .from('challenges')
                .update({
                    last_trade_at: new Date().toISOString(),
                })
                .eq('id', challenge.id);
        }

        res.json({ success: true, processed: trades.length });

    } catch (error: any) {
        console.error("Trade webhook error:", error);
        res.status(500).json({ error: error.message });
    }
});




// POST /api/mt5/webhook - General Purpose Webhook (Breach, etc.)
router.post('/webhook', async (req: Request, res: Response) => {
    try {
        const secret = req.headers['x-webhook-secret'];
        if (secret !== process.env.MT5_WEBHOOK_SECRET) {
            console.warn(`[Security] Unauthorized general webhook attempt with invalid secret.`);
            return res.status(401).json({ error: 'Unauthorized: Invalid webhook secret' });
        }

        const body = req.body;
        console.log(`🔔 [Backend] Received Event Webhook:`, JSON.stringify(body, null, 2));

        if (body.event === 'account_breached') {
            const { login, reason, equity, balance } = body;

            // 1. Find Challenge
            const { data: challenge, error: findError } = await supabase
                .from('challenges')
                .select('*')
                .eq('login', login)
                .single();

            if (findError || !challenge) {
                console.error(`❌ [Webhook] Challenge not found for login ${login}`);
                res.status(404).json({ error: 'Challenge not found' });
                return;
            }

            if (challenge.status === 'breached' || challenge.status === 'failed') {
                console.log(`ℹ️ [Webhook] Challenge ${login} already marked as ${challenge.status}.`);
                res.json({ success: true, message: 'Already processed' });
                return;
            }

            // 2. Update Status
            const { error: updateError } = await supabase
                .from('challenges')
                .update({
                    status: 'breached',
                    current_equity: equity,
                    current_balance: balance
                })
                .eq('id', challenge.id);

            if (updateError) {
                console.error(`❌ [Webhook] Failed to update challenge status:`, updateError);
                res.status(500).json({ error: updateError.message });
                return;
            }

            // 3. Send Notification
            try {
                // Fetch User Email & Name via Admin API
                const { data: userData, error: userError } = await supabase.auth.admin.getUserById(challenge.user_id);

                if (userError || !userData.user) {
                    console.error(`❌ [Webhook] Failed to fetch user for breach email: ${userError?.message}`);
                } else {
                    const email = userData.user.email;
                    const name = userData.user.user_metadata?.full_name || userData.user.user_metadata?.name || 'Trader';

                    if (email) {
                        const description = `Account Equity (${equity}) fell below the limit allowed by the risk rules using balance ${balance}.`;
                        await EmailService.sendBreachNotification(email, name, String(login), reason, description);
                        console.log(`📧 [Webhook] Breach email sent to ${email}`);
                    }
                }
            } catch (emailErr) {
                console.error(`⚠️ [Webhook] Failed to send breach email:`, emailErr);
            }

            console.log(`✅ [Webhook] Processed Breach for ${login}: ${reason}`);
            res.json({ success: true, action: 'breached' });
            return;
        }

        res.json({ status: 'ignored', message: 'Unknown event type' });
    } catch (error) {
        console.error('Webhook Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
