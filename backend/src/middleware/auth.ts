import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

let supabaseClient: any = null;

const getSupabase = () => {
    if (supabaseClient) return supabaseClient;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase URL/Key missing in environment');
    }

    supabaseClient = createClient(supabaseUrl, supabaseKey);
    return supabaseClient;
};

export interface AuthRequest extends Request {
    user?: any;
}

const CACHE_TTL = 60 * 1000; // 60 seconds
const authCache = new Map<string, { user: any; expires: number }>();
const JWT_SECRET = process.env.JWT_SECRET || 'sharkfunded_admin_secret_2026_secure_key';

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        // 1. Check for Admin API Key (Backend-to-Backend/Admin Panel)
        const adminKey = req.headers['x-admin-api-key'];
        const envAdminKey = process.env.ADMIN_API_KEY;

        if (adminKey && envAdminKey && adminKey === envAdminKey) {
            const adminEmail = req.headers['x-admin-email'] as string;
            const DEBUG = process.env.DEBUG === 'true';
            if (DEBUG) console.log(`[Auth] Authenticated via Admin API Key (Email: ${adminEmail || 'system'})`);

            req.user = {
                id: 'admin-system',
                role: 'admin',
                email: adminEmail || 'admin@system.local'
            };
            next();
            return;
        }

        // 2. Check for Admin JWT Cookie (from Admin Portal)
        const adminSessionToken = req.cookies?.['admin_session'];
        if (adminSessionToken) {
            try {
                const decoded = jwt.verify(adminSessionToken, JWT_SECRET) as any;
                const allowedRoles = ['admin', 'super_admin', 'sub_admin', 'risk_admin', 'payouts_admin'];

                if (decoded && allowedRoles.includes(decoded.role)) {
                    req.user = {
                        id: decoded.id,
                        role: decoded.role,
                        email: decoded.email,
                        permissions: decoded.permissions || []
                    };
                    next();
                    return;
                }
            } catch (jwtError) {
                const DEBUG = process.env.DEBUG === 'true';
                if (DEBUG) console.warn('[Auth] Admin JWT verification failed');
            }
        }

        const authHeader = req.headers.authorization;
        if (!authHeader) {
            res.status(401).json({ error: 'Missing Authorization header' });
            return;
        }

        const token = authHeader.split(' ')[1]; // Bearer <token>
        if (!token || token === 'undefined' || token === 'null') {
            res.status(401).json({ error: 'Invalid token format' });
            return;
        }

        // --- CACHE CHECK ---
        const now = Date.now();
        const cached = authCache.get(token);
        if (cached && cached.expires > now) {
            req.user = cached.user;
            next();
            return;
        }

        const { data: { user }, error } = await getSupabase().auth.getUser(token);

        if (error || !user) {
            res.status(401).json({ error: 'Invalid or expired token' });
            return;
        }

        // --- CACHE SET ---
        authCache.set(token, { user, expires: now + CACHE_TTL });
        if (authCache.size > 1000) {
            const firstKey = authCache.keys().next().value;
            if (firstKey) authCache.delete(firstKey);
        }

        const { data: profile } = await getSupabase()
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        req.user = {
            id: user.id,
            email: user.email,
            role: profile?.role || 'user'
        };

        next();
    } catch (error) {
        console.error('Auth error:', error);
        res.status(401).json({ error: 'Authentication failed' });
    }
};

export const requireRole = (roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        const user = req.user;
        if (!user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        if (!roles.includes(user.role)) {
            res.status(403).json({ error: 'Access denied: Insufficient permissions' });
            return;
        }

        next();
    };
};

export const requirePermission = (permission: string) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        const user = req.user;
        if (!user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        // Super Admin always allowed
        if (user.role === 'super_admin') {
            next();
            return;
        }

        // If user has a specific permission whitelist, enforce it
        if (user.permissions && user.permissions.length > 0) {
            if (!user.permissions.includes(permission.toLowerCase())) {
                const DEBUG = process.env.DEBUG === 'true';
                if (DEBUG) console.warn(`[Auth] Permission denied for ${user.email}. Missing: ${permission}`);
                res.status(403).json({ error: `Access denied: Missing requirement '${permission}'` });
                return;
            }
        }

        next();
    };
};
