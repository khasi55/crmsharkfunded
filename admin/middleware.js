import { NextResponse } from 'next/server'

export function middleware() {
  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/users/:path*', '/kyc/:path*'],
}
