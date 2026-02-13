import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { supabase } from '../lib/supabase';
import { validateRequest, profileUpdateSchema, passwordUpdateSchema, emailUpdateSchema, walletUpdateSchema } from '../middleware/validation';
import { sensitiveLimiter } from '../middleware/rate-limit';
import { logSecurityEvent } from '../utils/security-logger';

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
            .select('id, full_name, phone, country, address, pincode, display_name, avatar_url, wallet_balance, created_at')
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
router.put('/profile', authenticate, validateRequest(profileUpdateSchema), async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user!;
        const updates = req.body;

        // Update profile
        const { data, error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', user.id)
            .select()
            .single();

        if (error) {
            console.error('Error updating profile:', error);
            await logSecurityEvent({
                userId: user.id,
                email: user.email,
                action: 'UPDATE_PROFILE',
                resource: 'profile',
                payload: updates,
                status: 'failure',
                errorMessage: error.message,
                ip: req.ip
            });
            res.status(500).json({ error: 'Failed to update profile' });
            return;
        }

        await logSecurityEvent({
            userId: user.id,
            email: user.email,
            action: 'UPDATE_PROFILE',
            resource: 'profile',
            payload: updates,
            status: 'success',
            ip: req.ip
        });

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
router.put('/update-email', authenticate, sensitiveLimiter, validateRequest(emailUpdateSchema), async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user!;
        const { currentPassword, newEmail } = req.body;

        // 🛡️ SECURITY LAYER: Verify current password
        const { error: authError } = await supabase.auth.signInWithPassword({
            email: user.email,
            password: currentPassword
        });

        if (authError) {
            await logSecurityEvent({
                userId: user.id,
                email: user.email,
                action: 'UPDATE_EMAIL_AUTH_FAIL',
                resource: 'auth',
                status: 'failure',
                errorMessage: 'Invalid current password',
                ip: req.ip
            });
            res.status(401).json({ error: 'Invalid current password' });
            return;
        }

        // Update email via Supabase Auth
        const { error } = await supabase.auth.admin.updateUserById(
            user.id,
            { email: newEmail }
        );

        if (error) {
            console.error('Error updating email:', error);
            await logSecurityEvent({
                userId: user.id,
                email: user.email,
                action: 'UPDATE_EMAIL',
                resource: 'auth',
                payload: { newEmail },
                status: 'failure',
                errorMessage: error.message,
                ip: req.ip
            });
            res.status(500).json({ error: 'Failed to update email' });
            return;
        }

        await logSecurityEvent({
            userId: user.id,
            email: user.email,
            action: 'UPDATE_EMAIL',
            resource: 'auth',
            payload: { newEmail },
            status: 'success',
            ip: req.ip
        });

        res.json({ success: true, message: 'Email updated successfully. Please verify your new email.' });

    } catch (error: any) {
        console.error('Email update error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/user/update-password - Update user password
router.put('/update-password', authenticate, sensitiveLimiter, validateRequest(passwordUpdateSchema), async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user!;
        const { currentPassword, newPassword } = req.body;

        // 🛡️ SECURITY LAYER: Verify current password
        const { error: authError } = await supabase.auth.signInWithPassword({
            email: user.email,
            password: currentPassword
        });

        if (authError) {
            await logSecurityEvent({
                userId: user.id,
                email: user.email,
                action: 'UPDATE_PASSWORD_AUTH_FAIL',
                resource: 'auth',
                status: 'failure',
                errorMessage: 'Invalid current password',
                ip: req.ip
            });
            res.status(401).json({ error: 'Invalid current password' });
            return;
        }

        // Update password via Supabase Auth
        const { error } = await supabase.auth.admin.updateUserById(
            user.id,
            { password: newPassword }
        );

        if (error) {
            console.error('Error updating password:', error);
            await logSecurityEvent({
                userId: user.id,
                email: user.email,
                action: 'UPDATE_PASSWORD',
                resource: 'auth',
                status: 'failure',
                errorMessage: error.message,
                ip: req.ip
            });
            res.status(500).json({ error: 'Failed to update password' });
            return;
        }

        await logSecurityEvent({
            userId: user.id,
            email: user.email,
            action: 'UPDATE_PASSWORD',
            resource: 'auth',
            status: 'success',
            ip: req.ip
        });

        res.json({ success: true, message: 'Password updated successfully' });

    } catch (error: any) {
        console.error('Password update error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/user/wallet - Get user wallet details
router.get('/wallet', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        const { data: wallet, error } = await supabase
            .from('wallet_addresses')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

        if (error) {
            console.error('Error fetching wallet:', error);
            res.status(500).json({ error: 'Failed to fetch wallet' });
            return;
        }

        // Also fetch balance from profile as backup/display
        const { data: profile } = await supabase
            .from('profiles')
            .select('wallet_balance')
            .eq('id', user.id)
            .single();

        res.json({
            wallet: wallet || null,
            balance: profile?.wallet_balance || 0
        });

    } catch (error: any) {
        console.error('Wallet GET error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/user/wallet - Save user wallet address
router.post('/wallet', authenticate, sensitiveLimiter, validateRequest(walletUpdateSchema), async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user!;
        const { walletAddress } = req.body;

        // Check if already locked
        const { data: existing } = await supabase
            .from('wallet_addresses')
            .select('is_locked')
            .eq('user_id', user.id)
            .maybeSingle();

        if (existing?.is_locked) {
            res.status(400).json({ error: 'Wallet address is locked and cannot be changed.' });
            return;
        }

        // Upsert wallet address
        const { data, error } = await supabase
            .from('wallet_addresses')
            .upsert({
                user_id: user.id,
                wallet_address: walletAddress,
                wallet_type: 'USDT_TRC20', // Default for now
                is_locked: true, // Auto-lock on save as per UI
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' })
            .select()
            .single();

        if (error) {
            await logSecurityEvent({
                userId: user.id,
                email: user.email,
                action: 'SAVE_WALLET',
                resource: 'wallet',
                payload: { walletAddress },
                status: 'failure',
                errorMessage: error.message,
                ip: req.ip
            });

            if (error.code === '23503') {
                res.status(401).json({ error: 'Session invalid. User account not found.' });
            } else {
                console.error('Error saving wallet:', error);
                res.status(500).json({ error: 'Failed to save wallet address' });
            }
            return;
        }

        await logSecurityEvent({
            userId: user.id,
            email: user.email,
            action: 'SAVE_WALLET',
            resource: 'wallet',
            payload: { walletAddress },
            status: 'success',
            ip: req.ip
        });

        res.json({ success: true, wallet: data });

    } catch (error: any) {
        console.error('Wallet POST error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
