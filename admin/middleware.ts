import { NextResponse, type NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = process.env.JWT_SECRET || 'demo-secret-key-123';
const secret = new TextEncoder().encode(JWT_SECRET)

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
    return NextResponse.next();
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
