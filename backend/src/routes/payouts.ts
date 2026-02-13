import { Router, Response, Request } from 'express';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';
import { supabase } from '../lib/supabase';
import { RulesService } from '../services/rules-service';
import { validateRequest, payoutRequestSchema } from '../middleware/validation';
import { resourceIntensiveLimiter } from '../middleware/rate-limit';
import { logSecurityEvent } from '../utils/security-logger';

const router = Router();

// GET /api/payouts/balance
router.get('/balance', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        // Fetch wallet address
        const { data: wallet } = await supabase
            .from('wallet_addresses')
            .select('wallet_address')
            .eq('user_id', user.id)
            .eq('is_locked', true)
            .single();

        // Fetch ALL active accounts (filter in memory for robustness)
        const { data: accountsRaw } = await supabase
            .from('challenges')
            .select('*')
            .eq('user_id', user.id);

        // Check KYC status
        const { data: kycSession } = await supabase
            .from('kyc_sessions')
            .select('status')
            .eq('user_id', user.id)
            .eq('status', 'approved')
            .limit(1)
            .single();

        // Robust Filter: Case insensitive check for Funded/Instant types AND Status
        const fundedAccounts = (accountsRaw || []).filter((acc: any) => {
            const status = (acc.status || '').toLowerCase();
            if (status !== 'active') return false;

            const type = (acc.challenge_type || '').toLowerCase();
            return type.includes('instant') || type.includes('funded') || type.includes('master');
        });

        const isKycVerified = !!kycSession;
        const hasFundedAccount = fundedAccounts.length > 0;

        const DEBUG = process.env.DEBUG === 'true';
        // if (DEBUG) console.log(`[Payouts] User ${user.id} - Active Accounts: ${accountsRaw?.length || 0}. Eligible (Funded/Instant): ${fundedAccounts.length}.`);

        // Fetch payout history (Active requests: pending, approved, processed)
        const { data: allPayouts } = await supabase
            .from('payout_requests')
            .select('amount, metadata, status')
            .eq('user_id', user.id)
            .neq('status', 'rejected');

        // Calculate total profit from FUNDED accounts only
        let totalProfit = 0;

        const eligibleAccountsDetail = fundedAccounts.map((acc: any) => {
            const profit = Number(acc.current_balance) - Number(acc.initial_balance);
            let available = Math.max(0, profit * 0.8);

            // Deduct payouts associated with this account
            const accountPayouts = (allPayouts || []).filter((p: any) =>
                p.metadata?.challenge_id === acc.id
            );

            const paidOrPending = accountPayouts.reduce((sum: number, p: any) => sum + Number(p.amount), 0);

            // Subtract paid amount from 80% share
            available = Math.max(0, available - paidOrPending);

            if (profit > 0) {
                totalProfit += profit;
            }
            return {
                id: acc.id,
                account_number: acc.mt5_login || acc.id.substring(0, 8), // Ensure we have a display name
                type: acc.challenge_type,
                status: acc.status,
                profit: profit,
                available: available
            };
        });

        // Add Consistency Check for each account in accountList
        const accountsWithConsistency = await Promise.all(eligibleAccountsDetail.map(async (acc: any) => {
            const consistency = await RulesService.checkConsistency(acc.id);
            return {
                ...acc,
                consistency
            };
        }));

        const availablePayout = accountsWithConsistency.reduce((sum: number, acc: any) => sum + acc.available, 0);
        const profitTargetMet = availablePayout > 0;

        // Fetch payout history
        const { data: payouts } = await supabase
            .from('payout_requests')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        const payoutList = payouts || [];

        // Calculate stats
        const totalPaid = payoutList
            .filter((p: any) => p.status === 'processed')
            .reduce((sum: number, p: any) => sum + Number(p.amount), 0);

        const pending = payoutList
            .filter((p: any) => p.status === 'pending')
            .reduce((sum: number, p: any) => sum + Number(p.amount), 0);

        const responsePayload = {
            balance: {
                available: Math.max(0, availablePayout),
                totalPaid,
                pending,
            },
            accountList: accountsWithConsistency,
            walletAddress: wallet?.wallet_address || null,
            hasWallet: !!wallet,
            eligibility: {
                fundedAccountActive: hasFundedAccount,
                walletConnected: !!wallet,
                profitTargetMet: profitTargetMet,
                kycVerified: isKycVerified
            }
        };

        // if (DEBUG) console.log("Payouts Response Payload:", JSON.stringify(responsePayload, null, 2));
        res.json(responsePayload);

    } catch (error: any) {
        // console.error('Payout balance error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/payouts/history
router.get('/history', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        const { data: payouts, error } = await supabase
            .from('payout_requests')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Fetch account details for these payouts
        const payoutsWithAccount = await Promise.all((payouts || []).map(async (p: any) => {
            let accountInfo = { account_number: 'N/A', type: '' };
            let challengeId = p.metadata?.challenge_id;

            // Handle if metadata comes as string (edge case)
            if (typeof p.metadata === 'string') {
                try {
                    const parsed = JSON.parse(p.metadata);
                    challengeId = parsed.challenge_id;
                } catch (e) {
                    // console.error('Error parsing metadata JSON:', e);
                }
            }

            if (challengeId) {
                // Default to ID fragment
                accountInfo.account_number = challengeId.substring(0, 8);

                const { data: challenge } = await supabase
                    .from('challenges')
                    .select('mt5_login, challenge_type')
                    .eq('id', challengeId)
                    .maybeSingle();

                if (challenge) {
                    accountInfo = {
                        account_number: challenge.mt5_login || challengeId.substring(0, 8),
                        type: challenge.challenge_type
                    };
                } else {
                    const DEBUG = process.env.DEBUG === 'true';
                    // if (DEBUG) console.log(`[Payout History] Challenge not found for ID: ${challengeId}`);
                }
            } else {
                const DEBUG = process.env.DEBUG === 'true';
                // if (DEBUG) console.log(`[Payout History] No challenge_id in metadata for payout ${p.id}`, p.metadata);
            }

            return {
                ...p,
                ...accountInfo
            };
        }));

        res.json({ payouts: payoutsWithAccount });
    } catch (error: any) {
        // console.error('Payout history error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/payouts/request
router.post('/request', authenticate, resourceIntensiveLimiter, validateRequest(payoutRequestSchema), async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user!;
        const { amount, method, challenge_id } = req.body;

        // 0. CHECK KYC STATUS (CRITICAL)
        const { data: kycSession } = await supabase
            .from('kyc_sessions')
            .select('status')
            .eq('user_id', user.id)
            .eq('status', 'approved')
            .limit(1)
            .maybeSingle();

        if (!kycSession) {
            await logSecurityEvent({
                userId: user.id,
                email: user.email,
                action: 'PAYOUT_REQUEST_KYC_FAIL',
                resource: 'payout',
                payload: { amount, challenge_id },
                status: 'failure',
                errorMessage: 'KYC Verification Required',
                ip: req.ip
            });
            return res.status(400).json({ error: 'KYC Verification Required. Please complete your identity verification before requesting a payout.' });
        }

        // 1. Fetch & Validate Wallet Address
        const { data: wallet } = await supabase
            .from('wallet_addresses')
            .select('wallet_address')
            .eq('user_id', user.id)
            .eq('is_locked', true)
            .maybeSingle();

        if (!wallet || !wallet.wallet_address) {
            return res.status(400).json({ error: 'No active/locked wallet address found. Please update your settings.' });
        }

        // if (DEBUG) console.log(`[Payout Request] Using Wallet: ${wallet.wallet_address}`);

        // 2. Validate Available Balance (SECURITY FIX)
        // Re-calculate total profit across ALL funded accounts to be safe
        const { data: accountsRaw, error: accountsError } = await supabase
            .from('challenges')
            .select('*') // We need mt5_login etc for metadata so select all
            .eq('user_id', user.id);

        if (accountsError) {
            // console.error('[Payout Request] Error fetching accounts:', accountsError);
            throw accountsError;
        }

        // Robust Filter matching balance endpoint
        const fundedAccounts = (accountsRaw || []).filter((acc: any) => {
            const status = (acc.status || '').toLowerCase();
            if (status !== 'active') return false;

            const type = (acc.challenge_type || '').toLowerCase();
            return type.includes('instant') || type.includes('funded') || type.includes('master');
        });

        // if (DEBUG) console.log(`[Payout Request] Eligible Accounts: ${fundedAccounts.length}`);

        // Ensure target account exists in funded list if provided
        let targetAccount = null;
        if (challenge_id) {
            targetAccount = fundedAccounts.find((acc: any) => acc.id === challenge_id);
            if (!targetAccount) {
                // if (DEBUG) {
                //     console.warn(`[Payout Request] Target account ${challenge_id} not found in eligible list.`);
                //     // Log what WAS found for debugging
                //     console.log(`[Payout Request] Available IDs: ${fundedAccounts.map((a: any) => a.id).join(', ')}`);
                // }
                return res.status(400).json({ error: 'Invalid or ineligible account selected.' });
            }
        }

        let maxPayout = 0;

        if (targetAccount) {
            const profit = Number(targetAccount.current_balance) - Number(targetAccount.initial_balance);
            maxPayout = Math.max(0, profit * 0.8);
        } else {
            // Legacy global calculation (sum of all)
            let totalProfit = 0;
            fundedAccounts.forEach((acc: any) => {
                const profit = Number(acc.current_balance) - Number(acc.initial_balance);
                if (profit > 0) {
                    totalProfit += profit;
                }
            });
            maxPayout = totalProfit * 0.8;
        }

        // if (DEBUG) console.log(`[Payout Request] Max Payout: ${maxPayout}`);

        // Check already requested amounts (Pending + Processed)
        const { data: previousPayouts, error: prevPayoutsError } = await supabase
            .from('payout_requests')
            .select('amount, status, metadata')
            .eq('user_id', user.id)
            .neq('status', 'rejected'); // Count all except rejected

        if (prevPayoutsError) {
            // console.error('[Payout Request] Error fetching previous payouts:', prevPayoutsError);
            throw prevPayoutsError;
        }

        // If scoping to account, we must filter previous payouts for that account too
        let alreadyRequested = 0;
        if (targetAccount) {
            // Filter by metadata.challenge_id matching target
            alreadyRequested = previousPayouts?.filter((p: any) => p.metadata?.challenge_id === targetAccount.id)
                .reduce((sum, p) => sum + Number(p.amount), 0) || 0;
        } else {
            alreadyRequested = previousPayouts?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
        }

        // if (DEBUG) console.log(`[Payout Request] Already Requested: ${alreadyRequested}`);

        const remainingPayout = maxPayout - alreadyRequested;

        if (amount > remainingPayout) {
            return res.status(400).json({
                error: `Insufficient profit share. Available: $${remainingPayout.toFixed(2)} (Requested: $${amount})`
            });
        }

        // 3. Get Specific Account for Metadata
        // If no challenge_id provided, default to first funded account found
        const account = targetAccount || fundedAccounts[0];

        if (!account) {
            res.status(400).json({ error: 'No eligible funded account found.' });
        }

        // if (DEBUG) console.log(`[Payout Request] Proceeding with account: ${account.id}, Account Type: ${account.account_type_id}`);

        // 2. Validate Consistency (INSTANT ACCOUNTS ONLY)
        let mt5Group = '';
        let isInstant = false;

        if (account.account_type_id) {
            const { data: accountType, error: acTypeError } = await supabase
                .from('account_types')
                .select('mt5_group_name')
                .eq('id', account.account_type_id)
                .maybeSingle();

            if (acTypeError) {
                // console.error('[Payout Request] Account type fetch error:', acTypeError);
            } else if (accountType) {
                mt5Group = accountType.mt5_group_name || '';
            }
        } else {
            // if (DEBUG) console.warn(`[Payout Request] Account ${account.id} has NO account_type_id. Skipping strict group check.`);
        }

        // if (DEBUG) console.log(`[Payout Request] Resolved MT5 Group: ${mt5Group} (from ID: ${account.account_type_id})`);

        // Fallback: Check challenge_type if mt5Group logic didn't catch it
        if (mt5Group) {
            isInstant = mt5Group.includes('\\0-') || mt5Group.toLowerCase().includes('instant');
        } else {
            // Fallback to checking challenge_type string directly if we couldn't resolve group
            const typeStr = (account.challenge_type || '').toLowerCase();
            isInstant = typeStr.includes('instant');
            // if (DEBUG) console.log(`[Payout Request] Fallback Instant Check (from type '${typeStr}'): ${isInstant}`);
        }

        if (isInstant) {
            // if (DEBUG) console.log(`[Payout Request] Instant account detected. Checking consistency...`);

            if (!mt5Group) {
                // if (DEBUG) console.warn('[Payout Request] Cannot check consistency rules - No MT5 Group resolved. Allowing request.');
            } else {
                // Fetch risk rules for this MT5 group
                const { data: config, error: configError } = await supabase
                    .from('risk_rules_config')
                    .select('max_single_win_percent, consistency_enabled')
                    .eq('mt5_group_name', mt5Group)
                    .maybeSingle();

                if (configError) {
                    // if (DEBUG) console.warn('[Payout Request] Risk config fetch error (using defaults):', configError.message);
                }

                const maxWinPercent = config?.max_single_win_percent || 50;
                const checkConsistency = config?.consistency_enabled !== false;

                // if (DEBUG) console.log(`[Payout Request] Max Win %: ${maxWinPercent}, Consistency Enabled: ${checkConsistency}`);

                if (checkConsistency) {
                    // Fetch ALL winning trades for this account
                    const { data: trades, error: tradesError } = await supabase
                        .from('trades')
                        .select('profit_loss, ticket_number')
                        .eq('challenge_id', account.id)
                        .gt('profit_loss', 0) // Winning trades only
                        .gt('lots', 0); // Exclude deposits

                    if (tradesError) {
                        // console.error('[Payout Request] Trades fetch error:', tradesError);
                        throw tradesError;
                    }

                    if (trades && trades.length > 0) {
                        const totalProfit = trades.reduce((sum, t) => sum + Number(t.profit_loss), 0);
                        // if (DEBUG) console.log(`[Payout Request] Total Profit from trades: ${totalProfit}`);

                        // Check each trade
                        for (const trade of trades) {
                            const profit = Number(trade.profit_loss);
                            const percent = (profit / totalProfit) * 100;

                            if (percent > maxWinPercent) {
                                // if (DEBUG) console.warn(`[Payout Request] Consistency violation. Trade ${trade.ticket_number}: ${percent}%`);
                                res.status(400).json({
                                    error: `Consistency rule violation: Trade #${trade.ticket_number} represents ${percent.toFixed(1)}% of total profit (Max: ${maxWinPercent}%). Payout denied.`
                                });
                                return;
                            }
                        }
                    }
                }
            }
        }

        // 3. Create Payout Request
        // if (DEBUG) console.log(`[Payout Request] Creating payout request record...`);
        const { error: insertError } = await supabase
            .from('payout_requests')
            .insert({
                user_id: user.id,
                amount: amount,
                status: 'pending',
                payout_method: method || 'crypto',
                wallet_address: wallet.wallet_address,
                metadata: {
                    challenge_id: account.id,
                    request_date: new Date().toISOString()
                }
            });
        if (insertError) {
            // console.error('[Payout Request] Insert Error:', insertError);
            throw insertError;
        }

        // Notify Admins
        try {
            const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
            const userName = profile?.full_name || 'User';

            // Dynamic import to avoid top-level issues if any
            const { NotificationService } = await import('../services/notification-service');

            await NotificationService.createNotification(
                'New Payout Request',
                `${userName} requested a payout of $${amount} via ${method || 'crypto'}.`,
                'payout',
                user.id,
                { payout_request_id: 'pending', amount, challenge_id: account.id }
            );
        } catch (notifError) {
            // console.error('Failed to send notification (non-blocking):', notifError);
        }

        await logSecurityEvent({
            userId: user.id,
            email: user.email,
            action: 'PAYOUT_REQUEST',
            resource: 'payout',
            payload: { amount, challenge_id },
            status: 'success',
            ip: req.ip
        });

        res.json({ success: true, message: 'Payout request submitted successfully' });

    } catch (error: any) {
        // console.error('Payout request error FULL OBJECT:', error); // Log full error object
        // console.error('Payout request error MESSAGE:', error.message);
        // console.error('Payout request error STACK:', error.stack);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

// ============================================
// ADMIN ENDPOINTS
// ============================================

// GET /api/payouts/admin - Get all payout requests (admin only)
router.get('/admin', authenticate, requireRole(['super_admin', 'payouts_admin', 'admin']), async (req: AuthRequest, res: Response) => {
    try {
        // Fetch all payout requests with user profiles
        const { data: requests, error } = await supabase
            .from('payout_requests')
            .select('*, profiles(full_name, email)')
            .order('created_at', { ascending: false });

        if (error) {
            // console.error('Error fetching admin payouts:', error);
            throw error;
        }

        // Fetch account details for each payout
        const requestsWithAccount = await Promise.all((requests || []).map(async (req: any) => {
            let accountInfo = null;
            let challengeId = req.metadata?.challenge_id;

            // Handle metadata as string edge case
            if (typeof req.metadata === 'string') {
                try {
                    const parsed = JSON.parse(req.metadata);
                    challengeId = parsed.challenge_id;
                } catch (e) {
                    // console.log(`[Admin Payouts] Failed to parse metadata for ${req.id}:`, req.metadata);
                }
            }

            if (challengeId) {
                const { data: challenge } = await supabase
                    .from('challenges')
                    .select('login, investor_password, current_equity, current_balance')
                    .eq('id', challengeId)
                    .maybeSingle();

                if (challenge) {
                    accountInfo = {
                        login: challenge.login,
                        investor_password: challenge.investor_password,
                        equity: challenge.current_equity,
                        balance: challenge.current_balance
                    };
                }
            }

            return {
                ...req,
                account_info: accountInfo
            };
        }));

        res.json({ payouts: requestsWithAccount });
    } catch (error: any) {
        // console.error('Admin payouts error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/payouts/admin/:id - Get single payout request details (admin only)
router.get('/admin/:id', authenticate, requireRole(['super_admin', 'payouts_admin', 'admin']), async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        const { data: request, error } = await supabase
            .from('payout_requests')
            .select('*, profiles(*)')
            .eq('id', id)
            .single();

        if (error) {
            // console.error('Error fetching payout details:', error);
            throw error;
        }

        if (!request) {
            res.status(404).json({ error: 'Payout request not found' });
            return;
        }

        // Fetch related challenge/account information if metadata contains challenge_id
        let accountInfo = null;
        if (request.metadata && request.metadata.challenge_id) {
            const { data: challenge } = await supabase
                .from('challenges')
                .select('id, login, investor_password, current_equity, current_balance, initial_balance, account_types(name, mt5_group_name)')
                .eq('id', request.metadata.challenge_id)
                .single();

            if (challenge) {
                const accountType: any = challenge.account_types;
                accountInfo = {
                    login: challenge.login,
                    investor_password: challenge.investor_password,
                    equity: challenge.current_equity,
                    balance: challenge.current_balance,
                    account_type: accountType?.name,
                    group: accountType?.mt5_group_name,
                    account_size: challenge.initial_balance,
                };
            }
        }

        res.json({ payout: { ...request, account_info: accountInfo } });
    } catch (error: any) {
        // console.error('Admin payout details error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/payouts/admin/:id/approve - Approve a payout request (admin only)
router.put('/admin/:id/approve', authenticate, requireRole(['super_admin', 'payouts_admin', 'admin']), async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
        const { id } = req.params;
        const { transaction_id } = req.body;

        let finalTransactionId = transaction_id;

        // Generate transaction ID automatically if not provided
        if (!finalTransactionId) {
            const timestamp = Date.now().toString(36);
            const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
            finalTransactionId = `TXN-${timestamp}-${randomStr}`;
        }

        const { error } = await supabase
            .from('payout_requests')
            .update({
                status: 'approved',
                transaction_id: finalTransactionId,
                processed_at: new Date().toISOString(),
            })
            .eq('id', id);

        if (error) {
            // console.error('Error approving payout:', error);
            throw error;
        }

        // Log Admin Action
        const { AuditLogger } = await import('../lib/audit-logger');
        AuditLogger.info(req.user.email, `Approved Payout Request: ${id}`, { payout_id: id, transaction_id: finalTransactionId });

        res.json({
            success: true,
            message: 'Payout approved successfully',
            transaction_id: finalTransactionId
        });
    } catch (error: any) {
        // console.error('Approve payout error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/payouts/admin/:id/reject - Reject a payout request (admin only)
router.put('/admin/:id/reject', authenticate, requireRole(['super_admin', 'payouts_admin', 'admin']), async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
        const { id } = req.params;
        const { reason } = req.body;

        if (!reason) {
            res.status(400).json({ error: 'Rejection reason is required' });
            return;
        }

        const { error } = await supabase
            .from('payout_requests')
            .update({
                status: 'rejected',
                rejection_reason: reason,
                processed_at: new Date().toISOString(),
            })
            .eq('id', id);

        if (error) {
            // console.error('Error rejecting payout:', error);
            throw error;
        }

        // Log Admin Action
        const { AuditLogger } = await import('../lib/audit-logger');
        AuditLogger.info(req.user.email, `Rejected Payout Request: ${id}`, { payout_id: id, reason });

        res.json({ success: true, message: 'Payout rejected successfully' });
    } catch (error: any) {
        // console.error('Reject payout error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
