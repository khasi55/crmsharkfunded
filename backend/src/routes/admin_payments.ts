
import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
    try {
        // 1. Fetch payments
        const { data: payments, error } = await supabase
            .from('payment_orders')
            .select('*')
            // .eq('status', 'paid') // Removed filter to show all transactions
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching admin payments:', error);
            return res.status(500).json({ error: 'Failed to fetch payments' });
        }

        if (!payments || payments.length === 0) {
            return res.json([]);
        }

        // 2. Extract unique user IDs
        const userIds = [...new Set(payments.map(p => p.user_id).filter(Boolean))];

        // 3. Fetch profiles manually
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', userIds);

        if (profilesError) {
            console.error('Error fetching profiles for payments:', profilesError);
            // Continue without profiles, showing Unknown
        }

        // 4. Map profiles to a dictionary for fast lookup
        const profilesMap: Record<string, any> = {};
        profiles?.forEach(p => {
            profilesMap[p.id] = p;
        });

        // 5. Merge data
        const formattedPayments = payments.map(p => {
            const profile = profilesMap[p.user_id];
            return {
                id: p.id,
                order_id: p.order_id,
                amount: p.amount,
                currency: p.currency,
                status: p.status,
                payment_method: p.payment_method,
                created_at: p.created_at,
                paid_at: p.paid_at,
                user_name: profile?.full_name || 'Unknown',
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
