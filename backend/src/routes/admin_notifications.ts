import express, { Router, Response } from 'express';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';
import { AuditLogger } from '../lib/audit-logger';
import { supabase } from '../lib/supabase';

const router = Router();

// GET /api/admin/notifications
router.get('/', authenticate, requireRole(['super_admin', 'admin']), async (req: AuthRequest, res: Response) => {
    try {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;

        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/admin/notifications/mark-read
router.post('/mark-read', authenticate, requireRole(['super_admin', 'admin']), async (req: AuthRequest, res: Response) => {
    try {
        const { id, all } = req.body;

        if (all) {
            const { error } = await supabase
                .from('notifications')
                .update({ read: true })
                .eq('read', false);
            if (error) throw error;
            AuditLogger.info(req.user?.email || 'admin', `Marked all notifications as read`, { category: 'Notification' });
        } else if (id) {
            const { error } = await supabase
                .from('notifications')
                .update({ read: true })
                .eq('id', id);
            if (error) throw error;
            AuditLogger.info(req.user?.email || 'admin', `Marked notification as read: ${id}`, { id, category: 'Notification' });
        }

        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/admin/notifications/:id
router.delete('/:id', authenticate, requireRole(['super_admin', 'admin']), async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', id);

        if (error) throw error;

        AuditLogger.warn(req.user?.email || 'admin', `Deleted notification ID: ${id}`, { id, category: 'Notification' });
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// TEST ENDPOINT: Create a dummy notification (so user can see it working)
router.post('/test-create', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { title, message, type } = req.body;
        const { data, error } = await supabase
            .from('notifications')
            .insert({
                title: title || 'Test Notification',
                message: message || 'This is a test notification generated from the admin panel.',
                type: type || 'info',
                read: false,
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;

        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
