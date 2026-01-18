import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

// 🛡️ IP WHITELIST CONFIGURATION
// Add your Public IP here to allow access to the dashboard.
// Everyone else will be redirected to /checkoutpage.
const ALLOWED_IPS = [
    '127.0.0.1', // Localhost IPv4
    '::1',       // Localhost IPv6
    '192.168.70.84', // User Local IP
    '164.90.158.92', // User Remote IP 1
    '94.207.224.23',  // User Remote IP 2
    '5.192.18.70'    // New IP Added
];
export async function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname;

    // 🔒 Dashboard Protection Logic
    // Protect /dashboard and other sensitive routes
    // 🛡️ IP WHITELIST DISABLED
    // Code removed to allow public access as per request
    // if (path.startsWith('/dashboard') ... ) { ... }

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
