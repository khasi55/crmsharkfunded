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

// GET /api/admin/affiliates/tree - Get hierarchical data
router.get('/tree', authenticate, requireRole(['super_admin', 'payouts_admin', 'sub_admin']), async (req: AuthRequest, res: Response) => {
    try {
        console.log("🌳 Fetching Affiliate Tree...");

        // 1. Fetch all profiles involved in referral system (with parallel pagination)
        // Optimization: Fetch total count first, then parallelize requests
        const { count, error: countError } = await supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .or('referral_code.neq.null,referred_by.not.is.null');

        if (countError) throw countError;

        const allProfiles: any[] = [];
        const PAGE_SIZE = 1000;
        const totalPages = Math.ceil((count || 0) / PAGE_SIZE);

        // Fetch pages in batches of 5 to avoid rate limits
        const BATCH_SIZE = 5;

        for (let i = 0; i < totalPages; i += BATCH_SIZE) {
            const batchPromises = [];
            for (let j = 0; j < BATCH_SIZE && i + j < totalPages; j++) {
                const page = i + j;
                batchPromises.push(
                    supabase
                        .from('profiles')
                        .select('id, email, full_name, referral_code, referred_by, created_at')
                        .or('referral_code.neq.null,referred_by.not.is.null')
                        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
                );
            }

            const results = await Promise.all(batchPromises);
            results.forEach(res => {
                if (res.data) allProfiles.push(...res.data);
                if (res.error) console.error("Error fetching page:", res.error);
            });
        }

        console.log(`Fetched total ${allProfiles.length} profiles in ${totalPages} pages.`);

        // 2. Fetch Coupon Usage from Orders
        const { data: orders, error: oError } = await supabase
            .from('payment_orders')
            .select('user_id, coupon_code, amount')
            .not('coupon_code', 'is', null)
            .eq('status', 'paid');

        if (oError) console.error("Error fetching orders:", oError);

        // 3. Identify Affiliates and Link Users
        const profileMap = new Map<string, any>(); // ID -> Profile
        const affiliateCodeMap = new Map<string, string>(); // Lowercase Code -> Affiliate ID
        const referredUsersMap = new Map<string, Set<string>>(); // Referrer ID -> Set of Referred User IDs
        const affiliateStatsMap = new Map<string, { sales_volume: number, sales_count: number }>(); // Affiliate ID -> Stats

        // Fetch System Coupons to map them to Affiliates
        const { data: systemCoupons } = await supabase
            .from('discount_coupons')
            .select('code, affiliate_id')
            .not('affiliate_id', 'is', null);

        const couponAffiliateIds = new Set<string>();
        systemCoupons?.forEach(c => {
            if (c.code && c.affiliate_id) {
                affiliateCodeMap.set(c.code.toLowerCase(), c.affiliate_id);
                couponAffiliateIds.add(c.affiliate_id);
            }
        });

        // Index Profiles
        allProfiles?.forEach(p => {
            profileMap.set(p.id, { ...p, referred_users: [] });
            if (p.referral_code) {
                affiliateCodeMap.set(p.referral_code.toLowerCase(), p.id);
            }
        });

        // Fetch Missing Profiles (Affiliates who only have system coupons)
        const missingProfileIds = Array.from(couponAffiliateIds).filter(id => !profileMap.has(id));
        if (missingProfileIds.length > 0) {
            const { data: missingProfiles, error: mpError } = await supabase
                .from('profiles')
                .select('id, email, full_name, referral_code, referred_by, created_at')
                .in('id', missingProfileIds);

            if (mpError) console.error("Error fetching missing profiles:", mpError);

            missingProfiles?.forEach(p => {
                profileMap.set(p.id, { ...p, referred_users: [] });
                // If they happen to have a code (but were missed?), map it too
                if (p.referral_code) {
                    affiliateCodeMap.set(p.referral_code.toLowerCase(), p.id);
                }
            });
        }

        const linkUserToAffiliate = (referrerId: string, userId: string) => {
            if (referrerId === userId) return; // Prevent self-referral loop
            if (!referredUsersMap.has(referrerId)) {
                referredUsersMap.set(referrerId, new Set());
            }
            referredUsersMap.get(referrerId)?.add(userId);
        };

        const addSalesStats = (affiliateId: string, amount: number) => {
            if (!affiliateStatsMap.has(affiliateId)) {
                affiliateStatsMap.set(affiliateId, { sales_volume: 0, sales_count: 0 });
            }
            const stats = affiliateStatsMap.get(affiliateId)!;
            stats.sales_volume += amount;
            stats.sales_count += 1;
        };

        // Pass 1: Direct Database Links (referred_by UUID)
        allProfiles?.forEach(p => {
            if (p.referred_by && profileMap.has(p.referred_by)) {
                linkUserToAffiliate(p.referred_by, p.id);
            }
        });

        // Pass 2: Coupon Code Links (payment_orders)
        orders?.forEach(o => {
            if (o.coupon_code) {
                const code = o.coupon_code.toLowerCase();
                const affiliateId = affiliateCodeMap.get(code);
                if (affiliateId) {

                    // Track Sales Stats
                    addSalesStats(affiliateId, Number(o.amount) || 0);

                    // Link User
                    if (profileMap.has(o.user_id)) {
                        linkUserToAffiliate(affiliateId, o.user_id);
                    }
                }
            }
        });

        // 4. Fetch Challenges & Assemble Tree
        // Collect all distinct referred user IDs
        const allReferredUserIds = new Set<string>();
        referredUsersMap.forEach((userIds) => {
            userIds.forEach(uid => allReferredUserIds.add(uid));
        });

        let challengesMap = new Map<string, any[]>();
        if (allReferredUserIds.size > 0) {
            const { data: challenges, error: cError } = await supabase
                .from('challenges')
                .select('id, user_id, login, status, plan_type:challenge_type, initial_balance, current_equity')
                .in('user_id', Array.from(allReferredUserIds));

            if (cError) console.error("Error fetching challenges:", cError);

            challenges?.forEach(c => {
                if (!challengesMap.has(c.user_id)) {
                    challengesMap.set(c.user_id, []);
                }
                challengesMap.get(c.user_id)?.push(c);
            });
        }

        const tree: any[] = [];
        const processedAffiliates = new Set<string>();

        // Build Tree Objects
        referredUsersMap.forEach((userIds, referrerId) => {
            const affiliate = profileMap.get(referrerId);
            if (affiliate) {
                const enrichedReferred = Array.from(userIds).map(uid => {
                    const userProfile = profileMap.get(uid);
                    return {
                        ...userProfile,
                        accounts: challengesMap.get(uid) || []
                    };
                });

                const stats = affiliateStatsMap.get(referrerId) || { sales_volume: 0, sales_count: 0 };

                tree.push({
                    ...affiliate,
                    referred_users: enrichedReferred,
                    referred_count: enrichedReferred.length,
                    sales_volume: stats.sales_volume,
                    sales_count: stats.sales_count
                });
                processedAffiliates.add(referrerId);
            }
        });

        // Pre-compute affiliate IDs for fast lookup
        const affiliateValuesSet = new Set(affiliateCodeMap.values());

        // Add Inactive Affiliates (No referrals but might have code OR sales)
        profileMap.forEach((p, id) => {
            // Check if they are already processed
            if (processedAffiliates.has(id)) return;

            // Check if they are an affiliate (have code OR have sales stats OR are in code map)
            // Note: We might have non-affiliate users in profileMap (the referred users). 
            // We only want to list them as TOP LEVEL nodes if they are actual affiliates.

            // Is Affiliate?
            const isAffiliate = p.referral_code || affiliateStatsMap.has(id) || affiliateValuesSet.has(id);

            if (isAffiliate) {
                const stats = affiliateStatsMap.get(id) || { sales_volume: 0, sales_count: 0 };

                tree.push({
                    ...p,
                    referred_users: [],
                    referred_count: 0,
                    sales_volume: stats.sales_volume,
                    sales_count: stats.sales_count
                });
            }
        });

        // Sort by most referrals
        tree.sort((a, b) => b.referred_count - a.referred_count);

        res.json({ tree });

    } catch (error: any) {
        console.error('Fetch affiliate tree error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
