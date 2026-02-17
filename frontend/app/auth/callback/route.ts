import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    // if "next" is in param, use it as the redirect URL
    const next = searchParams.get('next') ?? '/'

    if (code) {
        const supabase = await createClient()
        const { error, data } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
            console.log(`✅ [Auth Callback] Session exchanged successfully for user: ${data.user?.email}`);

            const forwardedHost = request.headers.get('x-forwarded-host') // original origin before load balancer
            const isLocalEnv = process.env.NODE_ENV === 'development'

            let redirectUrl = `${origin}${next}`;
            if (!isLocalEnv && forwardedHost) {
                redirectUrl = `https://${forwardedHost}${next}`;
            }

            console.log(`🔄 [Auth Callback] Redirecting to: ${redirectUrl}`);
            return NextResponse.redirect(redirectUrl)
        } else {
            console.error(`❌ [Auth Callback] Code Exchange Error:`, error);
        }
    } else {
        // Check for token_hash and type (Implicit/Recovery flow)
        const token_hash = searchParams.get('token_hash')
        const type = searchParams.get('type') as any // Cast to any to avoid type complexity with Supabase types if needed, or import EmailOtpType

        if (token_hash && type) {
            console.log(`🔍 [Auth Callback] Found token_hash and type (${type}). Verifying OTP...`);
            const supabase = await createClient()

            const { error, data } = await supabase.auth.verifyOtp({
                token_hash,
                type,
            })

            if (!error) {
                console.log(`✅ [Auth Callback] OTP verified successfully for user: ${data.user?.email}`);

                const forwardedHost = request.headers.get('x-forwarded-host')
                const isLocalEnv = process.env.NODE_ENV === 'development'

                let redirectUrl = `${origin}${next}`;
                if (!isLocalEnv && forwardedHost) {
                    redirectUrl = `https://${forwardedHost}${next}`;
                }

                console.log(`🔄 [Auth Callback] Redirecting to: ${redirectUrl}`);
                return NextResponse.redirect(redirectUrl)
            } else {
                console.error(`❌ [Auth Callback] OTP Verification Error:`, error);
            }
        } else {
            console.error(`❌ [Auth Callback] No code or token_hash/type provided in URL`);
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/login?error=Could not authenticate user`)
}
