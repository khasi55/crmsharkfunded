import { NextResponse, type NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Skip middleware for static files, api routes, and common assets
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/auth') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico' ||
    pathname === '/checkoutpage'
  ) {
    return NextResponse.next()
  }

  return NextResponse.next()
}

// Broad matcher, logic handled inside the function
export const config = {
  matcher: ['/:path*'],
}
