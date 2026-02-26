import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { supabase } from '../lib/supabase';
import { OTPService } from '../services/otp-service';
import { logSecurityEvent } from '../utils/security-logger';
import { getClientIP } from '../utils/ip';

const router = Router();

// GET /api/affiliate/stats - Get affiliate statistics
router.get('/stats', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        // Fetch current user's profile to get their referral code
        const { data: userProfile, error: profileError } = await supabase
            .from('profiles')
            .select('referral_code')
            .eq('id', user.id)
            .single();

        if (profileError) {
            console.error('Error fetching user profile:', profileError);
        }

        // Fetch referrals from profiles table
        const { data: referrals, error: referralsError } = await supabase
            .from('profiles')
            .select('id, full_name, created_at, total_commission')
            .eq('referred_by', user.id);

        if (referralsError) {
            console.error('Error fetching referrals:', referralsError);
        }

        // Fetch earnings from affiliate_earnings table
        const { data: earningsData, error: earningsError } = await supabase
            .from('affiliate_earnings')
            .select('*')
            .eq('referrer_id', user.id)
            .order('created_at', { ascending: false });

        if (earningsError && earningsError.code !== 'PGRST116') {
            console.error('Error fetching earnings:', earningsError);
        }

        // Fetch withdrawals
        const { data: withdrawalsData, error: withdrawalsError } = await supabase
            .from('affiliate_withdrawals')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (withdrawalsError && withdrawalsError.code !== 'PGRST116') {
            console.error('Error fetching withdrawals:', withdrawalsError);
        }

        const actualReferrals = referrals || [];
        const actualEarnings = earningsData || [];
        const actualWithdrawals = withdrawalsData || [];

        // Calculate stats
        const totalReferrals = actualReferrals.length;
        const activeReferrals = actualReferrals.length; // Simplified active logic
        const totalEarnings = actualEarnings.reduce((sum, e) => sum + Number(e.amount), 0);

        // Calculate withdrawn/pending amount
        // We subtract ALL withdrawals (pending + approved + processed) from available balance
        // Valid status: pending, approved, processed. Rejected ones are credit back (or never deducted)
        const totalWithdrawn = actualWithdrawals
            .filter(w => ['pending', 'approved', 'processed'].includes(w.status))
            .reduce((sum, w) => sum + Number(w.amount), 0);

        const availableBalance = totalEarnings - totalWithdrawn;
        const pendingWithdrawals = actualWithdrawals
            .filter(w => w.status === 'pending')
            .reduce((sum, w) => sum + Number(w.amount), 0);

        // Calculate conversion rate
        const conversionRate = totalReferrals > 0 ? 100 : 0; // Simplified

        res.json({
            affiliate: {
                referralCode: userProfile?.referral_code || 'GENERATE',
                totalReferrals,
                activeReferrals,
                totalEarnings,
                availableBalance: Math.max(0, availableBalance),
                withdrawnAmount: totalWithdrawn,
                pendingEarnings: pendingWithdrawals, // Renaming for frontend compat checks if needed, or just add new field
                conversionRate,
                earnings: actualEarnings,
                withdrawals: actualWithdrawals
            }
        });

    } catch (error: any) {
        console.error('Affiliate stats API error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/affiliate/withdraw - Request a withdrawal
router.post('/withdraw', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;
        const { amount, payout_method, payout_details, otp } = req.body;

        if (!user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        // 🛡️ SECURITY LAYER: Verify OTP
        if (!otp) {
            res.status(400).json({ error: 'Verification code is required' });
            return;
        }

        const isOtpValid = await OTPService.verifyOTP(user.id, otp);
        if (!isOtpValid) {
            await logSecurityEvent({
                userId: user.id,
                email: user.email,
                action: 'AFFILIATE_WITHDRAW_OTP_FAIL',
                resource: 'affiliate_withdrawal',
                status: 'failure',
                errorMessage: 'Invalid or expired verification code',
                ip: getClientIP(req)
            });
            res.status(401).json({ error: 'Invalid or expired verification code' });
            return;
        }

        if (!amount || amount <= 0) {
            res.status(400).json({ error: 'Invalid amount' });
            return;
        }

        // 1. Calculate Balance
        const { data: earningsData } = await supabase
            .from('affiliate_earnings')
            .select('amount')
            .eq('referrer_id', user.id);

        const { data: withdrawalsData } = await supabase
            .from('affiliate_withdrawals')
            .select('amount, status')
            .eq('user_id', user.id);

        const totalEarnings = (earningsData || []).reduce((sum, e) => sum + Number(e.amount), 0);
        const totalWithdrawn = (withdrawalsData || [])
            .filter(w => ['pending', 'approved', 'processed'].includes(w.status))
            .reduce((sum, w) => sum + Number(w.amount), 0);

        const available = totalEarnings - totalWithdrawn;

        if (amount > available) {
            res.status(400).json({ error: 'Insufficient balance' });
            return;
        }

        // 2. Create Withdrawal Request
        const { data, error } = await supabase
            .from('affiliate_withdrawals')
            .insert({
                user_id: user.id,
                amount,
                payout_method,
                payout_details: payout_details || {},
                status: 'pending'
            })
            .select()
            .single();

        if (error) throw error;

        res.json({ message: 'Withdrawal requested successfully', withdrawal: data });

    } catch (error: any) {
        console.error('Withdrawal request error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

// GET /api/affiliate/withdrawals - Get withdrawal history
router.get('/withdrawals', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        const { data: withdrawals, error } = await supabase
            .from('affiliate_withdrawals')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching withdrawals:', error);
            throw error;
        }

        res.json({ withdrawals: withdrawals || [] });
    } catch (error: any) {
        console.error('Withdrawals history error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
