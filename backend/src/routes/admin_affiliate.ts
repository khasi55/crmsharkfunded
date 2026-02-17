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

        const affiliateIdsForSales = Array.from(affiliateCodeMap.values());

        // 5. Fetch sales from direct referrals (even without coupons)
        const { data: referredUsers } = await supabase
            .from('profiles')
            .select('id, referred_by')
            .in('referred_by', affiliateIdsForSales);

        const referredUserIds = referredUsers?.map(u => u.id) || [];
        const userToReferrerMap = new Map<string, string>();
        referredUsers?.forEach(u => userToReferrerMap.set(u.id, u.referred_by!));

        // 6. Fetch all potentially relevant orders
        // (Either by referral users OR by coupons)
        const allAffiliateCodesRaw = Array.from(affiliateCodeMap.keys());
        const allAffiliateCodes = [...new Set([
            ...allAffiliateCodesRaw,
            ...allAffiliateCodesRaw.map(c => c.toLowerCase()),
            ...allAffiliateCodesRaw.map(c => c.toUpperCase()),
            ...allAffiliateCodesRaw.map(c => c.charAt(0).toUpperCase() + c.slice(1).toLowerCase())
        ])];

        const { data: orders, error: ordersError } = await supabase
            .from('payment_orders')
            .select('amount, coupon_code, user_id')
            .or(`coupon_code.in.(${allAffiliateCodes.join(',')}),user_id.in.(${referredUserIds.join(',')})`)
            .eq('status', 'paid');

        const salesStatsMap = new Map<string, { volume: number, count: number }>();
        orders?.forEach(o => {
            let attributedAffId: string | undefined;

            // Priority 1: Coupon Code (Explicit attribution)
            if (o.coupon_code) {
                attributedAffId = affiliateCodeMap.get(o.coupon_code.toLowerCase());
            }

            // Priority 2: Direct Referral (If no coupon or coupon doesn't belong to another affiliate)
            if (!attributedAffId && o.user_id) {
                attributedAffId = userToReferrerMap.get(o.user_id);
            }

            if (attributedAffId) {
                const stats = salesStatsMap.get(attributedAffId) || { volume: 0, count: 0 };
                stats.volume += Number(o.amount) || 0;
                stats.count += 1;
                salesStatsMap.set(attributedAffId, stats);
            }
        });

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
            .select('user_id, coupon_code, order_id, amount, currency, account_size, account_type_name, created_at')
            .in('user_id', referralIds)
            .eq('status', 'paid')
            .not('coupon_code', 'is', null);

        // Map user_id to their orders
        const userOrdersMap = new Map<string, any[]>();
        const userCouponMap = new Map<string, string>();

        userOrders?.forEach(o => {
            const orders = userOrdersMap.get(o.user_id) || [];
            orders.push({
                order_id: o.order_id,
                amount: o.amount,
                currency: o.currency,
                account_size: o.account_size,
                account_type_name: o.account_type_name,
                created_at: o.created_at
            });
            userOrdersMap.set(o.user_id, orders);

            if (o.coupon_code && !userCouponMap.has(o.user_id)) {
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
            sales_details: userOrdersMap.get(r.id) || [],
            accounts: []
        }));

        res.json({ referrals: enrichedReferrals });

    } catch (error: any) {
        console.error('Fetch referrals error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/admin/affiliates/sales - Get affiliate sales reports
router.get('/sales', authenticate, requireRole(['super_admin', 'payouts_admin', 'sub_admin']), async (req: AuthRequest, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 0;
        const limit = parseInt(req.query.limit as string) || 20;
        const search = (req.query.search as string || '').toLowerCase();



        // 1. Fetch total count of paid orders with coupons or potentially associated with affiliates
        // Note: Narrowing down to orders with coupons for better performance, but ideally we check all paid orders if we check referral_code too.
        let countQuery = supabase
            .from('payment_orders')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'paid')
            .not('coupon_code', 'is', null);

        const { count, error: countError } = await countQuery;
        if (countError) throw countError;

        // 2. Fetch paginated sales
        const { data: orders, error: oError } = await supabase
            .from('payment_orders')
            .select('*')
            .eq('status', 'paid')
            .not('coupon_code', 'is', null)
            .order('created_at', { ascending: false })
            .range(page * limit, (page + 1) * limit - 1);

        if (oError) throw oError;
        if (!orders || orders.length === 0) return res.json({ sales: [], total: 0 });

        // 3. Fetch unique customer profiles for these orders
        const customerIds = [...new Set(orders.map(o => o.user_id).filter(Boolean))];
        const profilesMap: Record<string, any> = {};
        if (customerIds.length > 0) {
            const { data: customerProfiles } = await supabase
                .from('profiles')
                .select('id, email, full_name')
                .in('id', customerIds);

            customerProfiles?.forEach(p => {
                profilesMap[p.id] = p;
            });
        }

        // 4. Resolve affiliates for these orders
        const rawCouponCodes = [...new Set(orders.map(o => o.coupon_code).filter(Boolean) as string[])];
        // Include both original and lowercase/uppercase to be safe for .in() query
        const couponCodes = [...new Set([
            ...rawCouponCodes,
            ...rawCouponCodes.map(c => c.toLowerCase()),
            ...rawCouponCodes.map(c => c.toUpperCase()),
            ...rawCouponCodes.map(c => c.charAt(0).toUpperCase() + c.slice(1).toLowerCase())
        ])];

        // Fetch coupons to find affiliate links
        const { data: coupons } = await supabase
            .from('discount_coupons')
            .select('code, affiliate_id, profiles:affiliate_id (email, full_name)')
            .in('code', couponCodes);

        // Fetch profiles whose referral_code matches any coupon code used
        const { data: profileReferrals } = await supabase
            .from('profiles')
            .select('id, email, full_name, referral_code')
            .in('referral_code', couponCodes);

        // Create a lookup map: coupon_code -> affiliate info
        const affiliateLookup = new Map<string, any>();

        coupons?.forEach(c => {
            if (c.code && c.profiles) {
                affiliateLookup.set(c.code.toLowerCase(), c.profiles);
            }
        });

        profileReferrals?.forEach(p => {
            if (p.referral_code) {
                affiliateLookup.set(p.referral_code.toLowerCase(), {
                    email: p.email,
                    full_name: p.full_name
                });
            }
        });

        // 5. Transform data for the frontend
        let sales = orders.map((o: any) => {
            const coupon = o.coupon_code?.toLowerCase();
            const affiliate = coupon ? affiliateLookup.get(coupon) : null;
            return {
                ...o,
                customer: profilesMap[o.user_id] || null,
                affiliate
            };
        });

        // 6. Apply client-side search across joined fields
        if (search) {
            sales = sales.filter(s =>
                s.order_id?.toLowerCase().includes(search) ||
                s.customer?.email?.toLowerCase().includes(search) ||
                s.customer?.full_name?.toLowerCase().includes(search) ||
                s.affiliate?.email?.toLowerCase().includes(search) ||
                s.affiliate?.full_name?.toLowerCase().includes(search) ||
                s.coupon_code?.toLowerCase().includes(search)
            );
        }

        res.json({ sales, total: count || 0 });

    } catch (error: any) {
        console.error('Fetch affiliate sales error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
