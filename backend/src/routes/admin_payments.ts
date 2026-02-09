
import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
    try {
        // 1. Fetch payments (Limit to 500 for stability)
        const { data: payments, error } = await supabase
            .from('payment_orders')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(500);

        if (error) {
            console.error('Error fetching admin payments:', error);
            return res.status(500).json({ error: 'Failed to fetch payments' });
        }

        if (!payments || payments.length === 0) {
            return res.json([]);
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
                user_name: profile?.full_name || profile?.email?.split('@')[0] || 'Unknown',
                user_email: profile?.email || 'Unknown'
            };
        });

        res.json(formattedPayments);
    } catch (err) {
        console.error('Internal server error in admin payments:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
