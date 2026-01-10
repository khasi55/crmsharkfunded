'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2, Mail, CheckCircle, ArrowLeft, ArrowRight } from 'lucide-react'
import AuthCard from '@/components/auth/AuthCard'
import { motion } from 'framer-motion'

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setSuccess(false)

        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to send reset email')
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
            <div className="min-h-screen flex items-center justify-center bg-[#EDF6FE] p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 shadow-xl text-center"
                >
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-8 h-8 text-blue-600" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 mb-4">Check your email</h2>
                    <p className="text-slate-600 mb-8 leading-relaxed">
                        We've sent a password reset link to <span className="text-slate-900 font-semibold">{email}</span>.
                        Please check your inbox to reset your password.
                    </p>
                    <Link
                        href="/login"
                        className="inline-flex items-center justify-center gap-2 w-full bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold py-3 rounded-xl transition-all"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Login
                    </Link>
                </motion.div>
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
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1" htmlFor="email">Email Address</label>
                    <div className="relative group">
                        <Mail className="absolute left-4 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                        <input
                            id="email"
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-12 py-3.5 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-400 font-medium"
                            placeholder="trader@sharkfunded.com"
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold py-4 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 mt-2"
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
