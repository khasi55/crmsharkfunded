import { NextResponse, type NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    const res = NextResponse.next()
    
    // Add a custom header to confirm middleware is running
    res.headers.set('x-middleware-executed', 'true')
    
    return res
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/data (data fetching files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - images
         */
        '/((?!_next/static|_next/data|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
