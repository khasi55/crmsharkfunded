import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { supabase } from '../lib/supabase';

const router = Router();

// GET /api/user/profile - Get user profile
router.get('/profile', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (error) {
            console.error('Error fetching profile:', error);
            res.status(500).json({ error: 'Failed to fetch profile' });
            return;
        }

        res.json({
            profile: profile || null,
            user: {
                id: user.id,
                email: user.email,
            },
        });

    } catch (error: any) {
        console.error('Profile GET error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/user/profile - Update user profile
router.put('/profile', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        const updates = req.body;

        // Validate and sanitize updates
        const allowedFields = ['full_name', 'phone', 'country', 'city', 'address'];
        const sanitizedUpdates: any = {};

        allowedFields.forEach(field => {
            if (updates[field] !== undefined) {
                sanitizedUpdates[field] = updates[field];
            }
        });

        // Update profile
        const { data, error } = await supabase
            .from('profiles')
            .update(sanitizedUpdates)
            .eq('id', user.id)
            .select()
            .single();

        if (error) {
            console.error('Error updating profile:', error);
            res.status(500).json({ error: 'Failed to update profile' });
            return;
        }

        res.json({
            success: true,
            profile: data,
        });

    } catch (error: any) {
        console.error('Profile PUT error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/user/update-email - Update user email
router.put('/update-email', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        const { email } = req.body;

        if (!email) {
            res.status(400).json({ error: 'Email is required' });
            return;
        }

        // Update email via Supabase Auth
        const { data, error } = await supabase.auth.admin.updateUserById(
            user.id,
            { email }
        );

        if (error) {
            console.error('Error updating email:', error);
            res.status(500).json({ error: 'Failed to update email' });
            return;
        }

        res.json({ success: true, message: 'Email updated successfully' });

    } catch (error: any) {
        console.error('Email update error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/user/update-password - Update user password
router.put('/update-password', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        const { password } = req.body;

        if (!password || password.length < 6) {
            res.status(400).json({ error: 'Password must be at least 6 characters' });
            return;
        }

        // Update password via Supabase Auth
        const { data, error } = await supabase.auth.admin.updateUserById(
            user.id,
            { password }
        );

        if (error) {
            console.error('Error updating password:', error);
            res.status(500).json({ error: 'Failed to update password' });
            return;
        }

        res.json({ success: true, message: 'Password updated successfully' });

    } catch (error: any) {
        console.error('Password update error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/user/wallet - Get user wallet balance
router.get('/wallet', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        const { data: profile, error } = await supabase
            .from('profiles')
            .select('wallet_balance')
            .eq('id', user.id)
            .single();

        if (error) {
            console.error('Error fetching wallet:', error);
            res.status(500).json({ error: 'Failed to fetch wallet' });
            return;
        }

        res.json({
            balance: profile?.wallet_balance || 0
        });

    } catch (error: any) {
        console.error('Wallet GET error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
