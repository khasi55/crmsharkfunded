import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

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

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        // 1. Check for Admin API Key (Backend-to-Backend/Admin Panel)
        const adminKey = req.headers['x-admin-api-key'];
        const envAdminKey = process.env.ADMIN_API_KEY || 'secure_admin_key_123'; // Fallback for dev

        if (adminKey && adminKey === envAdminKey) {
            console.log('[Auth] Authenticated via Admin API Key');
            req.user = { id: 'admin-system', role: 'admin', email: 'admin@system.local' };
            next();
            return;
        }

        // 2. Standard Supabase Auth
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            res.status(401).json({ error: 'Missing Authorization header' });
            return;
        }

        const token = authHeader.split(' ')[1]; // Bearer <token>
        if (!token) {
            res.status(401).json({ error: 'Invalid token format' });
            return;
        }

        const { data: { user }, error } = await getSupabase().auth.getUser(token);

        if (error || !user) {
            console.log('[Auth] Invalid token or user not found:', error);
            res.status(401).json({ error: 'Invalid or expired token' });
            return;
        }

        console.log(`[Auth] Authenticated User: ${user.id}`);
        req.user = user;
        next();
    } catch (error) {
        res.status(500).json({ error: 'Auth server error' });
    }
};
