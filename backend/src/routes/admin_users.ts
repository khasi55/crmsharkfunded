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
    }
});

// POST /api/admin/users/create - Create a new user manually
router.post('/create', checkAdminAuth, async (req, res) => {
    try {
        const { email, password, full_name, country, phone } = req.body;

        if (!email || !password || !full_name) {
            return res.status(400).json({ error: 'Missing required fields: email, password, full_name' });
        }

        console.log(`👤 Admin Create User Request: ${email}`);

        // 1. Create User in Supabase Auth
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Auto-confirm email since admin created it
            user_metadata: { full_name, country, phone }
        });

        if (authError) {
            console.error('Showstopper: Auth creation failed', authError);
            return res.status(400).json({ error: 'Auth Creation Failed: ' + authError.message });
        }

        if (!authUser.user) {
            return res.status(500).json({ error: 'User created but no user object returned' });
        }

        // 2. Create Profile in Public Table (if not auto-created by triggers)
        const profileData = {
            id: authUser.user.id,
            email,
            full_name,
            country,
            phone,
            phone_number: phone, // Backward compatibility
            role: 'user' // Default role
        };

        const { error: dbError } = await supabaseAdmin
            .from('profiles')
            .upsert(profileData);

        if (dbError) {
            console.error('Warning: Profile creation/update failed', dbError);
        }

        res.json({ success: true, message: 'User created successfully', user: authUser.user });

    } catch (error: any) {
        console.error('Admin Create User Error:', error);
        res.status(500).json({ error: 'Internal server error: ' + error.message });
    }
});

// GET /api/admin/users/search - Search users for dropdown (limit 50)
router.get('/search', checkAdminAuth, async (req, res) => {
    try {
        const query = req.query.q as string || '';

        let dbQuery = supabaseAdmin
            .from('profiles')
            .select('id, full_name, email, referral_code')
            .limit(100);

        const hasReferral = req.query.hasReferral === 'true';

        if (hasReferral) {
            dbQuery = dbQuery.not('referral_code', 'is', null);
        }

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

// POST /api/admin/users/update - Update user details
router.post('/update', checkAdminAuth, async (req, res) => {
    try {
        const { userId, full_name, country, phone } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'Missing required field: userId' });
        }

        console.log(`📝 Admin Update User Request: ${userId}`);

        // 1. Update Profile in Public Table
        const { error: dbError } = await supabaseAdmin
            .from('profiles')
            .update({ full_name, country, phone, phone_number: phone })
            .eq('id', userId);

        if (dbError) {
            console.error('Update Profile Failed:', dbError);
            return res.status(500).json({ error: 'Profile Update Failed: ' + dbError.message });
        }

        // 2. Update Supabase Auth Metadata (Best effort)
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
            userId,
            { user_metadata: { full_name, country, phone } }
        );

        if (authError) {
            console.warn('Auth Metadata Update Failed (Non-critical):', authError);
        }

        res.json({ success: true, message: 'User updated successfully' });

    } catch (error: any) {
        console.error('Admin Update User Error:', error);
        res.status(500).json({ error: 'Internal server error: ' + error.message });
    }
});

export default router;
