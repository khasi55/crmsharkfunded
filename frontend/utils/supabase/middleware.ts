import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    if (!supabaseUrl || !supabaseAnonKey) {
        console.error('Middleware Error: Missing Supabase Environment Variables');
        return supabaseResponse;
    }

    const supabase = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        request.cookies.set(name, value)
                    )
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // IMPORTANT: Avoid writing any logic between createServerClient and
    // supabase.auth.getUser(). A simple mistake could make it very hard to debug
    // issues with users being randomly logged out.

    // --- LOCKDOWN MODE: Redirect ALL traffic to Checkout Page ---
    // The middleware matcher in frontend/middleware.ts excludes '/checkoutpage', '/api', and assets.
    // So if we are here, we are on a page that should be locked (Dashboard, Login, Home, etc.).

    // Allow access only to specific paths if necessary (e.g. auth callback), otherwise redirect.
    // if (!request.nextUrl.pathname.startsWith('/checkoutpage')) {
    //     const url = request.nextUrl.clone()
    //     url.pathname = '/checkoutpage'
    //     return NextResponse.redirect(url)
    // }

    // --- OLD AUTH LOGIC (Restored) ---

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (
        !user &&
        !request.nextUrl.pathname.startsWith('/login') &&
        !request.nextUrl.pathname.startsWith('/auth') &&
        !request.nextUrl.pathname.startsWith('/signup') &&
        !request.nextUrl.pathname.startsWith('/forgot-password') &&
        !request.nextUrl.pathname.startsWith('/reset-password') &&
        !request.nextUrl.pathname.startsWith('/admin-login') &&
        !request.nextUrl.pathname.startsWith('/api')
    ) {
        // no user, redirect to login
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // EXTRA SECURITY: double check for dashboard paths
    if (!user && (
        request.nextUrl.pathname === '/' ||
        request.nextUrl.pathname.startsWith('/dashboard') ||
        request.nextUrl.pathname.startsWith('/challenges') ||
        request.nextUrl.pathname.startsWith('/payouts')
    )) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }


    return supabaseResponse
}
