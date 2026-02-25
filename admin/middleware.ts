import { NextResponse, type NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.warn("[Middleware] CRITICAL: JWT_SECRET environment variable is missing!");
}
const secret = new TextEncoder().encode(JWT_SECRET!)

const PERMISSION_MAP: Record<string, string> = {
    '/dashboard': 'dashboard',
    '/users': 'users',
    '/kyc': 'kyc requests',
    '/payouts': 'payouts',
    '/payments': 'payments',
    '/accounts': 'accounts list',
    '/passed-accounts': 'pending upgrades',
    '/mt5/actions': 'mt5 actions',
    '/mt5/assign': 'assign account',
    '/mt5': 'mt5 accounts',
    '/mt5-risk': 'risk settings',
    '/risk-violations': 'risk violations',
    '/affiliates': 'affiliate payouts',
    '/competitions': 'competitions',
    '/coupons': 'coupons',
    '/emails': 'emails',
    '/system-health': 'system health',
    '/event-scanner': 'event scanner',
    '/settings': 'settings',
    '/admins': 'admins',
    '/logs': 'audit logs',
};

export async function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname

    // 1. Allow public paths
    // Note: with basePath: '/admin', pathname is relative to /admin (so /login instead of /admin/login)
    // However, to be safe we check both or just the relative one.
    if (path.startsWith('/login') || path === '/' || path.startsWith('/_next') || path.includes('.')) {
        return NextResponse.next()
    }

    // 2. Check for admin_session cookie
    const token = request.cookies.get('admin_session')?.value

    if (!token) {
        console.warn(`[Middleware] No token found for ${path}. Redirecting to /login`)
        return NextResponse.redirect(new URL('/login', request.url))
    }

    try {
        // 3. Verify JWT
        const { payload } = await jwtVerify(token, secret)

        // 4. Check for admin roles
        const allowedRoles = ['admin', 'super_admin', 'sub_admin', 'risk_admin', 'payouts_admin']
        if (!allowedRoles.includes(payload.role as string)) {
            console.error(`[Middleware] Unauthorized role: ${payload.role}`)
            return NextResponse.redirect(new URL('/login', request.url))
        }

        // 5. Granular Permission Check
        if (payload.role !== 'super_admin' && payload.permissions && (payload.permissions as string[]).length > 0) {
            const permissions = payload.permissions as string[];

            // Helper to get first authorized route based on PERMISSION_MAP order
            const getFirstAuthorizedRoute = () => {
                const routes = Object.keys(PERMISSION_MAP);
                for (const route of routes) {
                    if (permissions.includes(PERMISSION_MAP[route])) return route; // Removed /admin prefix here too if implicit? No, map keys are paths.
                }
                return null;
            };

            // Access Check
            const sortedRoutes = Object.keys(PERMISSION_MAP).sort((a, b) => b.length - a.length);
            let matchedRoute: string | null = null;

            // Strip /admin prefix for matching against PERMISSION_MAP
            // const relativePath = path.replace(/^\/admin/, '') || '/'; // NO LONGER NEEDED if basePath removed?
            // Actually, if basePath is removed, path IS relative.
            const relativePath = path;

            for (const route of sortedRoutes) {
                if (relativePath === route || relativePath.startsWith(route + '/')) {
                    matchedRoute = route;
                    break;
                }
            }

            if (matchedRoute) {
                const requiredPermission = PERMISSION_MAP[matchedRoute];
                if (!permissions.includes(requiredPermission)) {
                    console.warn(`[Middleware] Path ${path} REQUIRES ${requiredPermission}. User has: ${permissions.join(', ')}`);
                    const fallback = getFirstAuthorizedRoute() || '/login';
                    return NextResponse.redirect(new URL(fallback, request.url));
                }
            } else if (relativePath === '/' || relativePath === '/dashboard') {
                // Landing page check
                if (!permissions.includes('dashboard')) {
                    const fallback = getFirstAuthorizedRoute();
                    if (fallback) return NextResponse.redirect(new URL(fallback, request.url));
                }
            }
        }

        // 6. Authorized - Proceed
        return NextResponse.next()
    } catch (error) {
        console.error('[Middleware] JWT Verification Failed:', error)
        // Clear invalid cookie and redirect
        const response = NextResponse.redirect(new URL('/login', request.url))
        response.cookies.delete('admin_session')
        return response
    }
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/data (data fetching files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - .svg, .png etc (images)
         */
        '/((?!_next/static|_next/data|_next/image|favicon.ico|login|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
