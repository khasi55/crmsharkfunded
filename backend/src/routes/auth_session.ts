import { Router, Response } from 'express';
import { supabase, supabaseAdmin } from '../lib/supabase';
import crypto from 'crypto';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// POST /api/auth/session
// Creates a new backend session after Supabase login
router.post('/session', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: 'Missing Authorization header' });
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        // 1. Verify token with Supabase
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        // 2. Optimized Logic: Check if valid session already exists
        const existingSessionId = req.cookies?.['sf_session'];
        const ip = (req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress) as string;
        const userAgent = req.headers['user-agent'];

        const isLocalhost = req.headers.host?.includes('localhost') || req.headers.host?.includes('127.0.0.1');

        if (existingSessionId) {
            const { data: existingSession } = await supabaseAdmin
                .from('api_sessions')
                .select('id, is_active, ip_address, user_agent')
                .eq('id', existingSessionId)
                .eq('user_id', user.id)
                .single();

            if (existingSession && existingSession.is_active && (existingSession.ip_address === ip || isLocalhost) && existingSession.user_agent === userAgent) {
                // IMPORTANT: Re-set the cookie even if it exists to ensure path: '/' is applied
                // and to extend the maxAge.
                res.cookie('sf_session', existingSession.id, {
                    httpOnly: true,
                    secure: !isLocalhost,
                    sameSite: isLocalhost ? 'lax' : 'none',
                    path: '/', // ESSENTIAL: Allow cookie on all /api routes
                    maxAge: 15 * 60 * 1000 // 15 Minutes
                });
                return res.json({ success: true, message: 'Session already active', exists: true });
            }
        }

        // 3. Create Session in DB (Only if missing or invalid)
        const sessionId = crypto.randomUUID();

        const { error: sessionError } = await supabaseAdmin
            .from('api_sessions')
            .insert({
                id: sessionId,
                user_id: user.id,
                ip_address: typeof ip === 'string' ? ip : JSON.stringify(ip),
                user_agent: userAgent,
                is_active: true
            });

        if (sessionError) {
            console.error('Error creating session:', sessionError);
            return res.status(500).json({ error: 'Failed to create session' });
        }

        // 4. Set httpOnly Cookie
        res.cookie('sf_session', sessionId, {
            httpOnly: true,
            secure: !isLocalhost,
            sameSite: isLocalhost ? 'lax' : 'none',
            path: '/', // ESSENTIAL: Allow cookie on all /api routes
            maxAge: 15 * 60 * 1000 // 15 Minutes
        });

        res.json({ success: true, message: 'Session initialized' });

    } catch (error) {
        console.error('Session creation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/auth/session
// Returns current authenticated user and session info
router.get('/session', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        res.json({
            user: req.user,
            success: true
        });
    } catch (error) {
        console.error('Session retrieval error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/auth/logout
// Deactivates the session
router.post('/logout', async (req, res) => {
    const sessionId = req.cookies.sf_session;
    if (sessionId) {
        await supabaseAdmin
            .from('api_sessions')
            .update({ is_active: false })
            .eq('id', sessionId);
    }
    res.clearCookie('sf_session');
    res.json({ success: true });
});

export default router;
