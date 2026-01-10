import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { supabase } from '../lib/supabase';

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

        // Fetch funded accounts
        const { data: accounts } = await supabase
            .from('challenges')
            .select('current_balance, initial_balance, challenge_type, status')
            .eq('user_id', user.id)
            .in('challenge_type', ['Master Account', 'Funded', 'Instant', 'Instant Funding'])
            .eq('status', 'active');

        // Check KYC status (using same admin client)
        const { data: kycSession } = await supabase
            .from('kyc_sessions')
            .select('status')
            .eq('user_id', user.id)
            .eq('status', 'approved')
            .limit(1)
            .single();

        const isKycVerified = !!kycSession;
        const hasFundedAccount = accounts && accounts.length > 0;

        // Calculate total profit
        let totalProfit = 0;
        if (accounts) {
            accounts.forEach((acc: any) => {
                const profit = Number(acc.current_balance) - Number(acc.initial_balance);
                if (profit > 0) {
                    totalProfit += profit;
                }
            });
        }

        const availablePayout = totalProfit * 0.8;
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

        res.json({
            balance: {
                available: Math.max(0, availablePayout),
                totalPaid,
                pending,
            },
            walletAddress: wallet?.wallet_address || null,
            hasWallet: !!wallet,
            eligibility: {
                fundedAccountActive: hasFundedAccount,
                walletConnected: !!wallet,
                profitTargetMet: profitTargetMet,
                kycVerified: isKycVerified
            }
        });

    } catch (error: any) {
        console.error('Payout balance error:', error);
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

        res.json({ payouts: payouts || [] });
    } catch (error: any) {
        console.error('Payout history error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/payouts/request
router.post('/request', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;
        const { amount, method } = req.body;

        if (!user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        // 2. Validate Available Balance (SECURITY FIX)
        // Re-calculate total profit across ALL funded accounts to be safe
        const { data: accounts } = await supabase
            .from('challenges')
            .select('current_balance, initial_balance, challenge_type, status')
            .eq('user_id', user.id)
            .in('challenge_type', ['Master Account', 'Funded', 'Instant', 'Instant Funding', 'prime_instant', 'lite_instant'])
            .eq('status', 'active');

        let totalProfit = 0;
        if (accounts) {
            accounts.forEach((acc: any) => {
                const profit = Number(acc.current_balance) - Number(acc.initial_balance);
                if (profit > 0) {
                    totalProfit += profit;
                }
            });
        }

        // 80% Profit Split
        const maxPayout = totalProfit * 0.8;

        // Check already requested amounts (Pending + Processed)
        const { data: previousPayouts } = await supabase
            .from('payout_requests')
            .select('amount, status')
            .eq('user_id', user.id)
            .neq('status', 'rejected'); // Count all except rejected

        const alreadyRequested = previousPayouts?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
        const remainingPayout = maxPayout - alreadyRequested;

        if (amount > remainingPayout) {
            return res.status(400).json({
                error: `Insufficient profit share. Available: $${remainingPayout.toFixed(2)} (Requested: $${amount})`
            });
        }

        // 3. Get Specific Account for Metadata (Active logic)
        const { data: account, error: accError } = await supabase
            .from('challenges')
            .select('*')
            .eq('user_id', user.id)
            .in('challenge_type', ['Master Account', 'Funded', 'Instant', 'Instant Funding', 'prime_instant', 'lite_instant'])
            .eq('status', 'active')
            .limit(1)
            .single();

        if (accError || !account) {
            res.status(400).json({ error: 'No eligible funded account found.' });
            return;
        }

        // 2. Validate Consistency (INSTANT ACCOUNTS ONLY)
        // Fetch account type to get MT5 group
        const { data: accountType } = await supabase
            .from('account_types')
            .select('mt5_group_name')
            .eq('id', account.account_type_id)
            .single();

        if (!accountType) {
            res.status(500).json({ error: 'Account type configuration not found.' });
            return;
        }

        const mt5Group = accountType.mt5_group_name;
        const isInstant = mt5Group.includes('\\0-') || mt5Group.toLowerCase().includes('instant');

        if (isInstant) {
            // Fetch risk rules for this MT5 group
            const { data: config } = await supabase
                .from('risk_rules_config')
                .select('max_single_win_percent, consistency_enabled')
                .eq('mt5_group_name', mt5Group)
                .single();

            const maxWinPercent = config?.max_single_win_percent || 50;
            const checkConsistency = config?.consistency_enabled !== false;

            if (checkConsistency) {
                // Fetch ALL winning trades for this account
                const { data: trades } = await supabase
                    .from('trades')
                    .select('profit_loss, ticket_number')
                    .eq('challenge_id', account.id)
                    .gt('profit_loss', 0) // Winning trades only
                    .gt('lots', 0); // Exclude deposits

                if (trades && trades.length > 0) {
                    const totalProfit = trades.reduce((sum, t) => sum + Number(t.profit_loss), 0);

                    // Check each trade
                    for (const trade of trades) {
                        const profit = Number(trade.profit_loss);
                        const percent = (profit / totalProfit) * 100;

                        if (percent > maxWinPercent) {
                            res.status(400).json({
                                error: `Consistency rule violation: Trade #${trade.ticket_number} represents ${percent.toFixed(1)}% of total profit (Max: ${maxWinPercent}%). Payout denied.`
                            });
                            return;
                        }
                    }
                }
            }
        }

        // 3. Create Payout Request
        const { error: insertError } = await supabase
            .from('payout_requests')
            .insert({
                user_id: user.id,
                amount: amount,
                status: 'pending',
                method: method || 'crypto',
                metadata: {
                    challenge_id: account.id,
                    request_date: new Date().toISOString()
                }
            });

        if (insertError) {
            throw insertError;
        }

        res.json({ success: true, message: 'Payout request submitted successfully' });

    } catch (error: any) {
        console.error('Payout request error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

// ============================================
// ADMIN ENDPOINTS
// ============================================

// GET /api/payouts/admin - Get all payout requests (admin only)
router.get('/admin', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        // Fetch all payout requests with user profiles
        const { data: requests, error } = await supabase
            .from('payout_requests')
            .select('*, profiles(full_name, email)')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching admin payouts:', error);
            throw error;
        }

        res.json({ payouts: requests || [] });
    } catch (error: any) {
        console.error('Admin payouts error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/payouts/admin/:id - Get single payout request details (admin only)
router.get('/admin/:id', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        const { data: request, error } = await supabase
            .from('payout_requests')
            .select('*, profiles(*)')
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error fetching payout details:', error);
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
                .select('id, mt5_login, account_type_id, initial_balance, account_types(name, mt5_group_name)')
                .eq('id', request.metadata.challenge_id)
                .single();

            if (challenge) {
                const accountType: any = challenge.account_types;
                accountInfo = {
                    mt5_login: challenge.mt5_login,
                    account_type: accountType?.name,
                    account_size: challenge.initial_balance,
                };
            }
        }

        res.json({ payout: { ...request, account_info: accountInfo } });
    } catch (error: any) {
        console.error('Admin payout details error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/payouts/admin/:id/approve - Approve a payout request
router.put('/admin/:id/approve', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        // Generate transaction ID automatically (using timestamp + random string)
        const timestamp = Date.now().toString(36);
        const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
        const autoTransactionId = `TXN-${timestamp}-${randomStr}`;

        const { error } = await supabase
            .from('payout_requests')
            .update({
                status: 'approved',
                transaction_id: autoTransactionId,
                processed_at: new Date().toISOString(),
            })
            .eq('id', id);

        if (error) {
            console.error('Error approving payout:', error);
            throw error;
        }

        res.json({
            success: true,
            message: 'Payout approved successfully',
            transaction_id: autoTransactionId
        });
    } catch (error: any) {
        console.error('Approve payout error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/payouts/admin/:id/reject - Reject a payout request
router.put('/admin/:id/reject', authenticate, async (req: AuthRequest, res: Response) => {
    try {
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
            console.error('Error rejecting payout:', error);
            throw error;
        }

        res.json({ success: true, message: 'Payout rejected successfully' });
    } catch (error: any) {
        console.error('Reject payout error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
