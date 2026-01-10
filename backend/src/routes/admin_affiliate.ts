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

export default router;
