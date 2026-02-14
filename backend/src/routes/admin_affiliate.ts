import { Router, Response } from 'express';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { supabase } from '../lib/supabase';
import { AuditLogger } from '../lib/audit-logger';

const router = Router();

// GET /api/admin/affiliates/withdrawals - List requests
router.get('/withdrawals', authenticate, requireRole(['super_admin', 'payouts_admin', 'sub_admin']), async (req: AuthRequest, res: Response) => {
    try {
        const { status } = req.query;
        let query = supabase
            .from('affiliate_withdrawals')
            .select(`
                *,
                profiles:user_id (email, full_name)
            `)
            .order('created_at', { ascending: false });

        if (status && status !== 'all') {
            query = query.eq('status', status);
        }

        const { data, error } = await query;

        if (error) throw error;

        res.json({ withdrawals: data });
    } catch (error: any) {
        console.error('Fetch withdrawals error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/admin/affiliates/withdrawals/:id/status - Update status
router.post('/withdrawals/:id/status', authenticate, requireRole(['super_admin', 'payouts_admin', 'sub_admin']), async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { status, rejection_reason } = req.body;

        if (!['approved', 'rejected', 'processed', 'pending'].includes(status)) {
            res.status(400).json({ error: 'Invalid status' });
            return;
        }

        const updateData: any = {
            status,
            processed_at: status !== 'pending' ? new Date().toISOString() : null
        };

        if (status === 'rejected' && rejection_reason) {
            updateData.rejection_reason = rejection_reason;
        }

        const { data, error } = await supabase
            .from('affiliate_withdrawals')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        AuditLogger.info(req.user?.email || 'admin', `Updated withdrawal status for ID: ${id} to ${status}`, { id, status, category: 'Affiliate' });

        res.json({ message: 'Status updated', withdrawal: data });
    } catch (error: any) {
        console.error('Update withdrawal status error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/admin/affiliates/tree - Get hierarchical data (Paginated)
router.get('/tree', authenticate, requireRole(['super_admin', 'payouts_admin', 'sub_admin']), async (req: AuthRequest, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 0;
        const limit = parseInt(req.query.limit as string) || 20;
        const search = (req.query.search as string || '').toLowerCase();

        console.log(`🌳 Fetching Affiliate Tree (Page: ${page}, Limit: ${limit}, Search: ${search})...`);

        // 1. Fetch total count of potential affiliates
        let countQuery = supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true });

        if (search) {
            countQuery = countQuery.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,referral_code.ilike.%${search}%`);
        } else {
            countQuery = countQuery.not('referral_code', 'is', null);
        }

        const { count, error: countError } = await countQuery;
        if (countError) throw countError;

        // 2. Fetch paginated affiliates
        let profilesQuery = supabase
            .from('profiles')
            .select('id, email, full_name, referral_code, created_at')
            .order('created_at', { ascending: false })
            .range(page * limit, (page + 1) * limit - 1);

        if (search) {
            profilesQuery = profilesQuery.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,referral_code.ilike.%${search}%`);
        } else {
            profilesQuery = profilesQuery.not('referral_code', 'is', null);
        }

        const { data: affiliates, error: pError } = await profilesQuery;
        if (pError) throw pError;

        if (!affiliates) return res.json({ tree: [], total: 0 });

        // 3. Fetch referral counts for these affiliates efficiently
        const affiliateIds = affiliates.map(a => a.id);

        const { data: referralCounts } = await supabase
            .from('profiles')
            .select('referred_by')
            .in('referred_by', affiliateIds);

        const referralCountMap = new Map<string, number>();
        referralCounts?.forEach(r => {
            if (r.referred_by) {
                referralCountMap.set(r.referred_by, (referralCountMap.get(r.referred_by) || 0) + 1);
            }
        });

        // 4. Fetch all coupon codes for these affiliates (including custom ones)
        const { data: customCoupons } = await supabase
            .from('discount_coupons')
            .select('code, affiliate_id')
            .in('affiliate_id', affiliateIds);

        const affiliateCodeMap = new Map<string, string>(); // code (lowercase) -> affiliateId
        affiliates.forEach(a => {
            if (a.referral_code) {
                affiliateCodeMap.set(a.referral_code.toLowerCase(), a.id);
            }
        });
        customCoupons?.forEach(c => {
            if (c.code && c.affiliate_id) {
                affiliateCodeMap.set(c.code.toLowerCase(), c.affiliate_id);
            }
        });

        const allAffiliateCodes = Array.from(affiliateCodeMap.keys());

        // 5. Fetch sales for these codes
        const salesStatsMap = new Map<string, { volume: number, count: number }>();
        if (allAffiliateCodes.length > 0) {
            const { data: orders } = await supabase
                .from('payment_orders')
                .select('amount, coupon_code')
                .in('coupon_code', allAffiliateCodes)
                .eq('status', 'paid');

            orders?.forEach(o => {
                if (o.coupon_code) {
                    const affId = affiliateCodeMap.get(o.coupon_code.toLowerCase());
                    if (affId) {
                        const stats = salesStatsMap.get(affId) || { volume: 0, count: 0 };
                        stats.volume += Number(o.amount) || 0;
                        stats.count += 1;
                        salesStatsMap.set(affId, stats);
                    }
                }
            });
        }

        const tree = affiliates.map(a => {
            const stats = salesStatsMap.get(a.id) || { volume: 0, count: 0 };
            return {
                ...a,
                referred_count: referralCountMap.get(a.id) || 0,
                sales_volume: stats.volume,
                sales_count: stats.count,
                referred_users: [] // Lazy loaded
            };
        });

        res.json({ tree, total: count || 0 });

    } catch (error: any) {
        console.error('Fetch affiliate tree error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/admin/affiliates/tree/:id/referrals - Lazy load referred users
router.get('/tree/:id/referrals', authenticate, requireRole(['super_admin', 'payouts_admin', 'sub_admin']), async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        // 1. Fetch users referred directly via UUID
        const { data: directReferrals, error: dError } = await supabase
            .from('profiles')
            .select('id, email, full_name, created_at')
            .eq('referred_by', id);

        if (dError) throw dError;

        // 2. Fetch users referred via Coupon Code (from orders)
        const { data: profile } = await supabase.from('profiles').select('referral_code').eq('id', id).single();
        const code = profile?.referral_code;

        let couponReferrals: any[] = [];
        if (code) {
            const { data: orders, error: oError } = await supabase
                .from('payment_orders')
                .select(`
                    user_id,
                    profiles:user_id (id, email, full_name, created_at)
                `)
                .ilike('coupon_code', code)
                .eq('status', 'paid');

            if (!oError && orders) {
                const seen = new Set(directReferrals?.map(r => r.id) || []);
                orders.forEach(o => {
                    const p = o.profiles as any;
                    if (p && !seen.has(p.id)) {
                        couponReferrals.push(p);
                        seen.add(p.id);
                    }
                });
            }
        }

        const allReferrals = [...(directReferrals || []), ...couponReferrals];

        // 3. Find which coupons were used by these referrals
        const referralIds = allReferrals.map(r => r.id);
        const { data: userOrders } = await supabase
            .from('payment_orders')
            .select('user_id, coupon_code')
            .in('user_id', referralIds)
            .eq('status', 'paid')
            .not('coupon_code', 'is', null);

        // Map user_id to the most relevant coupon (one belonging to this affiliate or any used)
        const userCouponMap = new Map<string, string>();
        userOrders?.forEach(o => {
            if (o.coupon_code) {
                // For now, take the first valid one found
                userCouponMap.set(o.user_id, o.coupon_code);
            }
        });

        // 4. Check for account existence
        const { data: accountCounts } = await supabase
            .from('challenges')
            .select('user_id')
            .in('user_id', referralIds);

        const accountCountMap = new Map<string, number>();
        accountCounts?.forEach(a => {
            accountCountMap.set(a.user_id, (accountCountMap.get(a.user_id) || 0) + 1);
        });

        const enrichedReferrals = allReferrals.map(r => ({
            ...r,
            coupon_used: userCouponMap.get(r.id) || null,
            account_count: accountCountMap.get(r.id) || 0,
            accounts: []
        }));

        res.json({ referrals: enrichedReferrals });

    } catch (error: any) {
        console.error('Fetch referrals error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/admin/affiliates/tree/user/:id/accounts - Lazy load MT5 accounts
router.get('/tree/user/:id/accounts', authenticate, requireRole(['super_admin', 'payouts_admin', 'sub_admin']), async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { data: challenges, error } = await supabase
            .from('challenges')
            .select('id, user_id, login, status, plan_type:challenge_type, initial_balance, current_equity, created_at')
            .eq('user_id', id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({ accounts: challenges || [] });
    } catch (error: any) {
        console.error('Fetch user accounts error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
