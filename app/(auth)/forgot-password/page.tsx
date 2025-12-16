'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { Loader2, Mail, CheckCircle, ArrowLeft, ArrowRight } from 'lucide-react'
import AuthCard from '@/components/auth/AuthCard'

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const supabase = createClient()

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setSuccess(false)

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${location.origin}/auth/callback?next=/reset-password`,
            })

            if (error) {
                throw error
            }

            setSuccess(true)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a0f1c] relative overflow-hidden p-4">
                <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-[#00E5FF]/5 rounded-full blur-[120px] pointer-events-none animate-pulse" />
                <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-[#0055FF]/5 rounded-full blur-[120px] pointer-events-none animate-pulse delay-1000" />

                <div className="w-full max-w-md bg-[#121826]/70 backdrop-blur-xl border border-white/5 rounded-3xl p-8 shadow-2xl relative z-10 text-center">
                    <div className="w-16 h-16 bg-[#00E5FF]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-8 h-8 text-[#00E5FF]" />
                    </div>
                    <h2 className="text-2xl font-bold mb-4 text-white">Check your email</h2>
                    <p className="text-gray-400 mb-8 leading-relaxed">
                        We've sent a password reset link to <span className="text-white font-medium">{email}</span>.
                        Please check your inbox to reset your password.
                    </p>
                    <Link
                        href="/login"
                        className="inline-flex items-center justify-center gap-2 w-full bg-[#121826] hover:bg-[#1a2235] border border-gray-800 hover:border-gray-700 text-[#00E5FF] font-semibold py-3.5 rounded-xl transition-all"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Login
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <AuthCard
            title="Reset Password"
            subtitle="Enter your email to receive instructions"
            footerText="Remember your password?"
            footerLinkText="Log in"
            footerLinkHref="/login"
            error={error}
        >
            <form onSubmit={handleResetPassword} className="space-y-5">
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1" htmlFor="email">Email Address</label>
                    <div className="relative group">
                        <Mail className="absolute left-4 top-3.5 w-5 h-5 text-gray-500 group-focus-within:text-[#00E5FF] transition-colors" />
                        <input
                            id="email"
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-[#0a0f1c] border border-gray-800 rounded-xl px-12 py-3.5 text-white focus:outline-none focus:border-[#00E5FF]/50 focus:ring-4 focus:ring-[#00E5FF]/10 transition-all placeholder:text-gray-700 font-medium"
                            placeholder="name@example.com"
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-[#00E5FF] to-[#0099FF] hover:from-[#00c2d9] hover:to-[#0088e6] text-[#0a0f1c] font-bold py-4 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 mt-2"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                        <>
                            Send Reset Link
                            <ArrowRight className="w-5 h-5" />
                        </>
                    )}
                </button>
            </form>
        </AuthCard>
    )
}
