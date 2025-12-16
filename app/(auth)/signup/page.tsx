'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, Mail, Lock, ArrowRight, CheckCircle, User, Eye, EyeOff } from 'lucide-react'
import AuthCard from '@/components/auth/AuthCard'
import { motion, AnimatePresence } from 'framer-motion'

export default function SignupPage() {
    const [fullName, setFullName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const router = useRouter()
    const searchParams = useSearchParams()
    const referralCode = searchParams.get('ref')
    const supabase = createClient()

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        if (password !== confirmPassword) {
            setError("Passwords do not match")
            setLoading(false)
            return
        }

        try {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${location.origin}/auth/callback`,
                    data: {
                        full_name: fullName,
                        referral_code: referralCode, // Pass captured code to metadata
                    },
                },
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
                {/* Success Background Effects */}
                <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-[#00E5FF]/5 rounded-full blur-[120px] pointer-events-none animate-pulse" />
                <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-[#0055FF]/5 rounded-full blur-[120px] pointer-events-none animate-pulse delay-1000" />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-md bg-[#121826]/70 backdrop-blur-xl border border-white/5 rounded-3xl p-8 shadow-2xl relative z-10 text-center"
                >
                    <div className="w-16 h-16 bg-[#00E5FF]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-8 h-8 text-[#00E5FF]" />
                    </div>
                    <h2 className="text-2xl font-bold mb-4 text-white">Check your email</h2>
                    <p className="text-gray-400 mb-8 leading-relaxed">
                        We've sent a confirmation link to <span className="text-white font-medium">{email}</span>.
                        Please check your inbox to complete your registration.
                    </p>
                    <Link
                        href="/login"
                        className="inline-flex items-center justify-center gap-2 w-full bg-[#121826] hover:bg-[#1a2235] border border-gray-800 hover:border-gray-700 text-[#00E5FF] font-semibold py-3.5 rounded-xl transition-all"
                    >
                        Back to Login
                    </Link>
                </motion.div>
            </div>
        )
    }

    return (
        <AuthCard
            title="Create Account"
            subtitle="Join the elite trading community"
            footerText="Already have an account?"
            footerLinkText="Log in"
            footerLinkHref="/login"
            error={error}
        >
            <form onSubmit={handleSignup} className="space-y-6">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-[#00E5FF] uppercase tracking-widest ml-1" htmlFor="fullName">Full Name</label>
                    <div className="relative group">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-[#00E5FF] transition-colors duration-300" />
                        <input
                            id="fullName"
                            type="text"
                            required
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full bg-[#0a0f1c]/50 border border-gray-800 rounded-xl px-12 py-4 text-white placeholder:text-gray-700 font-medium focus:outline-none focus:border-[#00E5FF] glow-input transition-all duration-300"
                            placeholder="John Doe"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-[#00E5FF] uppercase tracking-widest ml-1" htmlFor="email">Email Address</label>
                    <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-[#00E5FF] transition-colors duration-300" />
                        <input
                            id="email"
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-[#0a0f1c]/50 border border-gray-800 rounded-xl px-12 py-4 text-white placeholder:text-gray-700 font-medium focus:outline-none focus:border-[#00E5FF] glow-input transition-all duration-300"
                            placeholder="trader@sharkfunded.com"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-[#00E5FF] uppercase tracking-widest ml-1" htmlFor="password">Password</label>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-[#00E5FF] transition-colors duration-300" />
                            <input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                required
                                minLength={6}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-[#0a0f1c]/50 border border-gray-800 rounded-xl pl-12 pr-10 py-4 text-white placeholder:text-gray-700 font-medium focus:outline-none focus:border-[#00E5FF] glow-input transition-all duration-300"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-[#00E5FF] uppercase tracking-widest ml-1" htmlFor="confirmPassword">Confirm</label>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-[#00E5FF] transition-colors duration-300" />
                            <input
                                id="confirmPassword"
                                type={showConfirmPassword ? "text" : "password"}
                                required
                                minLength={6}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full bg-[#0a0f1c]/50 border border-gray-800 rounded-xl pl-12 pr-10 py-4 text-white placeholder:text-gray-700 font-medium focus:outline-none focus:border-[#00E5FF] glow-input transition-all duration-300"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                            >
                                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-[#00E5FF] to-[#0099FF] hover:from-[#00c2d9] hover:to-[#0088e6] text-[#0a0f1c] font-black uppercase tracking-wider py-4 rounded-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(0,229,255,0.3)] hover:shadow-[0_0_50px_rgba(0,229,255,0.5)] mt-6"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                        <>
                            Start Trading
                            <ArrowRight className="w-5 h-5" />
                        </>
                    )}
                </button>
            </form>
        </AuthCard>
    )
}
