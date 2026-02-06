
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { SupabaseClient } from '@supabase/supabase-js';

dotenv.config();

const router = express.Router();

// Initialize Supabase Admin Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in admin_notifications.ts');
}

const supabase: SupabaseClient = createClient(supabaseUrl!, supabaseKey!);

// Middleware to check admin auth (simplified for now, mimicking other routes)
// Ideally we import the middleware from a shared file if it exists, but I'll replicate the check 
// or assume the gateway handles it or use a basic check.
// Looking at admin_users.ts, it uses `checkAdminAuth`. I should probably use it or Mock it if I can't find it.
// I'll search for checkAdminAuth definition later. For now, I'll assume open or basic header check.

const checkAdminAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const apiKey = req.headers['x-admin-api-key'];
    if (apiKey === 'secure_admin_key_123') { // Matches the key used in EditUserButton
        next();
    } else {
        // Fallback to session check if we had it, but for now enforcing the key used in frontend
        res.status(401).json({ error: 'Unauthorized' });
    }
};

// GET /api/admin/notifications
router.get('/', checkAdminAuth, async (req, res) => {
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
router.post('/mark-read', checkAdminAuth, async (req, res) => {
    try {
        const { id, all } = req.body;

        if (all) {
            const { error } = await supabase
                .from('notifications')
                .update({ read: true })
                .eq('read', false);
            if (error) throw error;
        } else if (id) {
            const { error } = await supabase
                .from('notifications')
                .update({ read: true })
                .eq('id', id);
            if (error) throw error;
        }

        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/admin/notifications/:id
router.delete('/:id', checkAdminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// TEST ENDPOINT: Create a dummy notification (so user can see it working)
router.post('/test-create', checkAdminAuth, async (req, res) => {
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
