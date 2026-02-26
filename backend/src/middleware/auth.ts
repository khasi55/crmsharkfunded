import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../lib/supabase';
import { getClientIP } from '../utils/ip';

export interface AuthRequest extends Request {
    user?: any;
}

const CACHE_TTL = 300000; // 5 minutes (Increased from 30s)
const authCache = new Map<string, { user: any; expires: number }>();
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error("[Auth] CRITICAL: JWT_SECRET environment variable is missing!");
}

// Helper to validate session and get profile
async function validateSession(sessionId: string, ip: string, userAgent: string, isLocalhost: boolean) {
    const { data: session, error: sessionError } = await supabase
        .from('api_sessions')
        .select('user_id, is_active, ip_address, user_agent')
        .eq('id', sessionId)
        .single();

    if (sessionError || !session || !session.is_active) {
        console.warn(`[Auth] Session ${sessionId} lookup failed: ${sessionError?.message || 'Not found or inactive'}`);
        return null;
    }

    // Device Binding (Relaxed: Log as warning but don't fail)
    if (!isLocalhost && session.ip_address && session.ip_address !== ip) {
        console.warn(`[Auth] IP Mismatch for session ${sessionId}: DB=${session.ip_address}, Request=${ip}. Allowing anyway.`);
    }
    if (!isLocalhost && session.user_agent && session.user_agent !== userAgent) {
        // console.warn(`[Auth] User-Agent Mismatch for session ${sessionId}. Allowing anyway.`);
    }

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email, is_admin, user_type')
        .eq('id', session.user_id)
        .single();

    if (profileError || !profile) {
        console.warn(`[Auth] Profile lookup failed for user ${session.user_id}: ${profileError?.message || 'Not found'}`);
        return null;
    }

    return {
        id: session.user_id,
        email: profile.email,
        role: profile.is_admin ? 'admin' : (profile.user_type || 'user')
    };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    // console.log(`🔒 [Auth] Checking ${req.method} ${req.path}`);
    try {
        // 1. Check for Admin API Key (Backend-to-Backend/Admin Panel)
        const adminKey = req.headers['x-admin-api-key'];
        const envAdminKey = process.env.ADMIN_API_KEY;

        if (adminKey && envAdminKey && adminKey === envAdminKey) {
            const adminEmail = req.headers['x-admin-email'] as string;
            // console.log(`   🔑 [Auth] API Key valid for ${adminEmail}`);
            req.user = { id: 'admin-system', email: adminEmail || 'admin@sharkfunded.com', role: 'super_admin' };
            next();
            return;
        }

        // 2. Check for Admin JWT Cookie (from Admin Portal)
        const adminSessionToken = req.cookies?.['admin_session'];
        if (adminSessionToken) {
            try {
                const decoded = jwt.verify(adminSessionToken, JWT_SECRET!) as any;
                // console.log(`[Auth] Decoded Admin Token:`, decoded); 

                if (decoded && decoded.id) {
                    let email = decoded.email;

                    // 🛡️ Fallback: If email is missing in JWT (legacy session?), fetch from DB
                    if (!email) {
                        console.warn(`[Auth] Admin JWT missing email. Fetching from DB for ID: ${decoded.id}`);
                        const { data: adminUser } = await supabase
                            .from('admin_users')
                            .select('email')
                            .eq('id', decoded.id)
                            .single();

                        if (adminUser?.email) {
                            email = adminUser.email;
                        } else {
                            console.error(`[Auth] Failed to find admin user for ID: ${decoded.id}. Defaulting to fallback.`);
                        }
                    }

                    req.user = {
                        id: decoded.id,
                        email: email || 'admin@sharkfunded.com',
                        role: decoded.role || 'admin',
                        permissions: decoded.permissions || []
                    };
                    next();
                    return;
                }
            } catch (jwtError) {
                console.warn(`[Auth] Admin JWT invalid: ${(jwtError as Error).message}`);
            }
        }

        // ... rest of the logic

        const authHeader = req.headers.authorization;
        const sessionId = req.cookies?.['sf_session'];
        const ip = getClientIP(req);
        const userAgent = req.headers['user-agent'] || '';
        const isLocalhost = !!(req.headers.host?.includes('localhost') || req.headers.host?.includes('127.0.0.1'));

        // --- CACHE CHECK ---
        const token = authHeader?.split(' ')[1];
        const cacheKey = token ? `${token}:${sessionId || 'no-session'}` : `session:${sessionId}`;
        const cached = authCache.get(cacheKey);
        if (cached && cached.expires > Date.now()) {
            req.user = cached.user;
            next();
            return;
        }

        // --- SESSION-ONLY AUTH (Critical for browser rewrites) ---
        if (!authHeader && sessionId) {
            const user = await validateSession(sessionId, ip, userAgent, isLocalhost);
            if (user) {
                req.user = user;
                authCache.set(cacheKey, { user, expires: Date.now() + CACHE_TTL });
                next();
                return;
            }
        }

        // --- BEARER TOKEN AUTH ---
        if (!token || token === 'undefined' || token === 'null') {
            console.warn(`[Auth] No valid authentication for ${req.originalUrl} (Session: ${sessionId ? 'present but failed' : 'missing'})`);
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        // Local JWT Verification (Replaces external supabase.auth.getUser)
        let decodedToken: any;

        const supabaseJwtSecret = process.env.SUPABASE_JWT_SECRET;
        if (!supabaseJwtSecret) {
            console.error('[Auth] CRITICAL ERROR: SUPABASE_JWT_SECRET is missing from environment variables!');
            console.error('[Auth] You MUST set this to your Supabase Project JWT Secret (Settings -> API -> JWT Settings) to prevent connection timeouts.');
            console.error('[Auth] WARNING: Do NOT use the anon key or service role key here.');
        }

        try {
            if (!supabaseJwtSecret) throw new Error("Missing SUPABASE_JWT_SECRET");
            decodedToken = jwt.verify(token, supabaseJwtSecret);
        } catch (jwtErr: any) {
            if (supabaseJwtSecret) {
                console.warn(`[Auth] Local JWT verification failed for ${req.originalUrl}: ${jwtErr.message}`);
            }

            // CRITICAL OPTIMIZATION: Do not use supabase.auth.getUser as a fallback if the secret is missing.
            // This causes a massive volume of Auth Network Requests (108k+/day) which depletes the DB budget.
            if (!supabaseJwtSecret) {
                console.error(`[Auth] Authentication rejected. Cannot verify securely without SUPABASE_JWT_SECRET.`);
                res.status(401).json({ error: 'System configuration error: Missing JWT secret' });
                return;
            }

            // Fallback strictly ONLY if local verification failed but we actually had a secret (maybe revoked token)
            // Still, this is a heavy operation.
            const { data: { user: supabaseUser }, error: authError } = await supabase.auth.getUser(token);
            if (authError || !supabaseUser) {
                console.warn(`[Auth] Supabase API fallback also failed: ${authError?.message || 'No user'}`);
                res.status(401).json({ error: 'Invalid or expired token' });
                return;
            }
            decodedToken = { sub: supabaseUser.id, email: supabaseUser.email };
        }

        const supabaseUserId = decodedToken.sub;
        if (!supabaseUserId) {
            res.status(401).json({ error: 'Invalid token payload' });
            return;
        }

        // --- ENRICH WITH SESSION IF AVAILABLE ---
        if (sessionId) {
            const userFromSession = await validateSession(sessionId, ip, userAgent, isLocalhost);
            if (userFromSession && userFromSession.id === supabaseUserId) {
                req.user = userFromSession;
                authCache.set(cacheKey, { user: userFromSession, expires: Date.now() + CACHE_TTL });
                next();
                return;
            }
        }

        // --- FALLBACK: JWT-ONLY (PROFILE FETCH) ---
        const { data: profile } = await supabase
            .from('profiles')
            .select('is_admin, user_type')
            .eq('id', supabaseUserId)
            .single();

        const role = profile?.is_admin ? 'admin' : (profile?.user_type || 'user');

        const fullUser = {
            id: supabaseUserId,
            email: decodedToken?.email || '',
            role: role
        };

        req.user = fullUser;
        authCache.set(cacheKey, { user: fullUser, expires: Date.now() + CACHE_TTL });

        console.log(`[Auth] Debug: ID=${fullUser.id}, Role=${fullUser.role}, ProfileFound=${!!profile}`);

        next();
    } catch (error) {
        console.error('[Auth] Critical middleware error:', error);
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

export const requireKYC = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
    }

    // Admins bypass KYC
    if (user.role === 'super_admin' || user.role === 'admin' || user.role === 'sub_admin') {
        next();
        return;
    }

    try {
        const { data: kycSessions, error } = await supabase
            .from('kyc_sessions')
            .select('status')
            .eq('user_id', user.id)
            .eq('status', 'approved')
            .limit(1);

        const kycSession = kycSessions?.[0];

        if (error || !kycSession) {
            res.status(400).json({
                error: 'KYC Authentication Required',
                message: 'Please complete your identity verification before performing this action.'
            });
            return;
        }

        next();
    } catch (error) {
        console.error('[Auth] KYC check error:', error);
        res.status(500).json({ error: 'Internal server error during KYC validation' });
    }
};
