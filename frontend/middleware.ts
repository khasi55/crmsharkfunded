import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

// 🛡️ IP WHITELIST CONFIGURATION
// Add your Public IP here to allow access to the dashboard.
// Everyone else will be redirected to /checkoutpage.
const ALLOWED_IPS = [
    '127.0.0.1', // Localhost IPv4
    '::1',       // Localhost IPv6
    '192.168.70.84', // User Local IP
    '164.90.158.92'  // User Remote IP
];

export async function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname;

    // 🔒 Dashboard Protection Logic
    // Protect /dashboard and other sensitive routes
    if (path.startsWith('/dashboard') ||
        path.startsWith('/overview') ||
        path.startsWith('/challenges') ||
        path.startsWith('/competitions') ||
        path.startsWith('/kyc') ||
        path.startsWith('/certificates') ||
        path.startsWith('/ranking') ||
        path.startsWith('/payouts') ||
        path.startsWith('/affiliate') ||
        path.startsWith('/settings')) {

        // Get Client IP
        let ip = (request as any).ip || request.headers.get('x-forwarded-for') || '127.0.0.1';

        // Handle proxies (x-forwarded-for can be "client, proxy1, proxy2")
        if (ip.includes(',')) {
            ip = ip.split(',')[0].trim();
        }

        // console.log(`🔒 [Middleware] Accessing ${path} from IP: ${ip}`);

        if (!ALLOWED_IPS.includes(ip)) {
            console.log(`⛔ [Middleware] Blocked IP ${ip} accessing ${path} -> Redirecting to Checkout`);
            return NextResponse.redirect(new URL('/checkoutpage', request.url));
        }
    }

    return await updateSession(request)
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - checkoutpage (public landing)
         * - login (auth)
         * - api (backend routes)
         * - auth (supabase auth callback)
         */
        '/((?!_next/static|_next/image|favicon.ico|checkoutpage|login|api|auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
