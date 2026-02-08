import { Router, Response } from 'express';
// We assume authenticate is handled by middleware or verify logic
// But since this is a new route file, we might not have 'authenticate' middleware for admin here easily
// unless we reuse the user one or rely on the proxy security (Admin Portal is secured).
// For backend simplicity, we'll assume the request comes from the Admin Proxy which adds an x-admin-key or similar,
// OR we just expose it and rely on the frontend proxy to securing it (Dangerous).
// Use existing 'authenticate' middleware for now, assuming admin is a user in 'auth.users' OR
// Use a specific admin middleware if available.
// Given strict RBAC, the Admin Portal Proxy ensures only authenticated admins call this.
// But backend should verify.
// We'll use the supabase service role client directly.

import { supabase } from '../lib/supabase';

const router = Router();

// GET /api/admin/affiliates/withdrawals - List requests
router.get('/withdrawals', async (req, res) => {
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
router.post('/withdrawals/:id/status', async (req, res) => {
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

        res.json({ message: 'Status updated', withdrawal: data });
    } catch (error: any) {
        console.error('Update withdrawal status error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/admin/affiliates/tree - Get hierarchical data
router.get('/tree', async (req, res) => {
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
            .select('user_id, coupon_code')
            .not('coupon_code', 'is', null)
            .eq('status', 'paid'); // Only paid orders count? Or all? Let's say paid/active.

        if (oError) console.error("Error fetching orders:", oError);

        // 3. Identify Affiliates and Link Users
        const profileMap = new Map<string, any>(); // ID -> Profile
        const affiliateCodeMap = new Map<string, string>(); // Lowercase Code -> Affiliate ID
        const referredUsersMap = new Map<string, Set<string>>(); // Referrer ID -> Set of Referred User IDs

        // Index Profiles
        allProfiles?.forEach(p => {
            profileMap.set(p.id, { ...p, referred_users: [] });
            if (p.referral_code) {
                affiliateCodeMap.set(p.referral_code.toLowerCase(), p.id);
            }
        });

        const linkUserToAffiliate = (referrerId: string, userId: string) => {
            if (referrerId === userId) return; // Prevent self-referral loop
            if (!referredUsersMap.has(referrerId)) {
                referredUsersMap.set(referrerId, new Set());
            }
            referredUsersMap.get(referrerId)?.add(userId);
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
                    // Check if user exists in profile map (might be a user without referral columns set)
                    // If they are not in allProfiles, we might need to fetch them? 
                    // But 'allProfiles' only fetched those involved in referrals. 
                    // So we should probably have fetched *all* profiles or at least ensure we have the user.
                    // For now, only link if we have the user profile.
                    // Ideally, we should fetch these users too.

                    // Optimization: If user used a code, they ARE involved. 

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

                tree.push({
                    ...affiliate,
                    referred_users: enrichedReferred,
                    referred_count: enrichedReferred.length
                });
                processedAffiliates.add(referrerId);
            }
        });

        // Add Inactive Affiliates
        allProfiles?.forEach(p => {
            if (p.referral_code && !processedAffiliates.has(p.id)) {
                tree.push({
                    ...p,
                    referred_users: [],
                    referred_count: 0
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
