import express, { Router, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { SupabaseClient } from '@supabase/supabase-js';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AuditLogger } from '../lib/audit-logger';

dotenv.config();

const router = Router();

// Initialize Supabase Admin Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in admin_notifications.ts');
}

const supabase: SupabaseClient = createClient(supabaseUrl!, supabaseKey!);

// GET /api/admin/notifications
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
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
router.post('/mark-read', authenticate, async (req: AuthRequest, res: Response) => {
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
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
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
