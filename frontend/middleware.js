import { NextResponse } from 'next/server'

export function middleware() {
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard',
    '/dashboard/:path*',
    '/kyc',
    '/kyc/:path*',
    '/settings',
    '/settings/:path*',
    '/checkoutpage',
    '/login',
    '/signup'
  ],
}
