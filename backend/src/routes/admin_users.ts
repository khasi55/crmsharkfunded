import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();

// Admin Supabase Client (Service Role)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("❌ Missing Supabase Admin Credentials in admin_users.ts");
}

const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceKey!, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

// Middleware to check for Admin API Key (Simple protection for now)
const checkAdminAuth = (req: any, res: any, next: any) => {
    const apiKey = req.headers['x-admin-api-key'];
    const validKey = process.env.ADMIN_API_KEY || 'secure_admin_key_123';

    if (apiKey !== validKey) {
        return res.status(401).json({ error: 'Unauthorized: Invalid Admin Key' });
    }
    next();
};

// POST /api/admin/users/update-email
router.post('/update-email', checkAdminAuth, async (req, res) => {
    try {
        const { userId, newEmail } = req.body;

        if (!userId || !newEmail) {
            return res.status(400).json({ error: 'Missing userId or newEmail' });
        }

        console.log(`📧 Admin Request: Updating email for user ${userId} to ${newEmail}`);

        // 1. Update in Supabase Auth
        const { data: user, error: authError } = await supabaseAdmin.auth.admin.updateUserById(
            userId,
            { email: newEmail, email_confirm: true }
        );

        if (authError) {
            console.error('Showstopper: Auth update failed', authError);
            return res.status(500).json({ error: 'Auth Update Failed: ' + authError.message });
        }

        // 2. Update in Profiles Table
        const { error: dbError } = await supabaseAdmin
            .from('profiles')
            .update({ email: newEmail })
            .eq('id', userId);

        if (dbError) {
            console.error('Warning: Profile update failed', dbError);
            return res.status(500).json({ error: 'Profile Update Failed: ' + dbError.message });
        }

        res.json({ success: true, message: 'Email updated successfully', user });

    } catch (error: any) {
        console.error('Admin Update Email Error:', error);
        res.status(500).json({ error: 'Internal server error: ' + error.message });
    }
});

// GET /api/admin/users/search - Search users for dropdown (limit 50)
router.get('/search', checkAdminAuth, async (req, res) => {
    try {
        const query = req.query.q as string || '';

        let dbQuery = supabaseAdmin
            .from('profiles')
            .select('id, full_name, email')
            .limit(50);

        if (query) {
            dbQuery = dbQuery.or(`full_name.ilike.%${query}%,email.ilike.%${query}%`);
        }

        const { data, error } = await dbQuery;

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        res.json({ users: data });

    } catch (error: any) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
