import { Router, Response } from 'express';
import { supabase } from '../lib/supabase';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, requireRole(['super_admin', 'payouts_admin', 'admin', 'sub_admin']), async (req: AuthRequest, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        const status = req.query.status as string;
        const offset = (page - 1) * limit;

        // 1. Build Query
        let query = supabase
            .from('payment_orders')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        // Apply status filter if provided
        if (status && status !== 'all') {
            query = query.eq('status', status);
        }

        // Execute Query
        const { data: payments, count, error } = await query;

        if (error) {
            console.error('Error fetching admin payments:', error);
            return res.status(500).json({ error: 'Failed to fetch payments' });
        }

        if (!payments || payments.length === 0) {
            return res.json({
                data: [],
                meta: {
                    total: 0,
                    page,
                    limit,
                    totalPages: 0
                }
            });
        }

        // 2. Extract unique user IDs
        const userIds = [...new Set(payments.map(p => p.user_id).filter(Boolean))];

        // 3. Batch profile fetching (Chunk size 50 to avoid Header Overflow)
        const profilesMap: Record<string, any> = {};
        const CHUNK_SIZE = 50;

        for (let i = 0; i < userIds.length; i += CHUNK_SIZE) {
            const chunk = userIds.slice(i, i + CHUNK_SIZE);
            const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('id, full_name, email')
                .in('id', chunk);

            if (profilesError) {
                console.error(`[Admin Payments] Error fetching profiles chunk ${i}-${i + CHUNK_SIZE}:`, profilesError);
                continue;
            }

            profiles?.forEach(p => {
                profilesMap[p.id] = p;
            });
        }

        // 4. Merge data
        const formattedPayments = payments.map(p => {
            const profile = profilesMap[p.user_id];

            return {
                id: p.id,
                order_id: p.order_id,
                amount: p.amount,
                currency: p.currency,
                status: p.status,
                payment_method: p.payment_method || 'gateway',
                payment_gateway: p.payment_gateway || 'Unknown',
                account_size: parseInt(String(p.account_size || 0).replace(/[^0-9]/g, '')) || 0,
                coupon_code: p.coupon_code || '-',
                created_at: p.created_at,
                paid_at: p.paid_at,
                user_name: profile?.full_name || profile?.email?.split('@')[0] || p.metadata?.customerName || p.metadata?.name || 'Guest User',
                user_email: profile?.email || p.metadata?.customerEmail || p.metadata?.email || 'Unknown'
            };
        });

        res.json({
            data: formattedPayments,
            meta: {
                total: count || 0,
                page,
                limit,
                totalPages: Math.ceil((count || 0) / limit)
            }
        });
    } catch (err) {
        console.error('Internal server error in admin payments:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
