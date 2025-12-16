'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2, Lock, ArrowRight, CheckCircle, Eye, EyeOff } from 'lucide-react'
import AuthCard from '@/components/auth/AuthCard'
import { motion } from 'framer-motion'
import Link from 'next/link'

export default function ResetPasswordPage() {
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        if (password !== confirmPassword) {
            setError("Passwords do not match")
            setLoading(false)
            return
        }

        try {
            const { error } = await supabase.auth.updateUser({
                password: password,
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
                    <h2 className="text-2xl font-bold mb-4 text-white">Password updated!</h2>
                    <p className="text-gray-400 mb-8 leading-relaxed">
                        Your password has been successfully reset. You can now log in with your new password.
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
            title="Reset Password"
            subtitle="Enter your new password below"
            footerText="Remember it?"
            footerLinkText="Log in"
            footerLinkHref="/login"
            error={error}
        >
            <form onSubmit={handleResetPassword} className="space-y-5">
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1" htmlFor="password">New Password</label>
                    <div className="relative group">
                        <Lock className="absolute left-4 top-3.5 w-5 h-5 text-gray-500 group-focus-within:text-[#00E5FF] transition-colors" />
                        <input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            required
                            minLength={6}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-[#0a0f1c] border border-gray-800 rounded-xl px-12 py-3.5 text-white focus:outline-none focus:border-[#00E5FF]/50 focus:ring-4 focus:ring-[#00E5FF]/10 transition-all placeholder:text-gray-700 font-medium"
                            placeholder="••••••••"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-3.5 text-gray-500 hover:text-white transition-colors"
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1" htmlFor="confirmPassword">Confirm Password</label>
                    <div className="relative group">
                        <Lock className="absolute left-4 top-3.5 w-5 h-5 text-gray-500 group-focus-within:text-[#00E5FF] transition-colors" />
                        <input
                            id="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            required
                            minLength={6}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full bg-[#0a0f1c] border border-gray-800 rounded-xl px-12 py-3.5 text-white focus:outline-none focus:border-[#00E5FF]/50 focus:ring-4 focus:ring-[#00E5FF]/10 transition-all placeholder:text-gray-700 font-medium"
                            placeholder="••••••••"
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-3.5 text-gray-500 hover:text-white transition-colors"
                        >
                            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-[#00E5FF] to-[#0099FF] hover:from-[#00c2d9] hover:to-[#0088e6] text-[#0a0f1c] font-bold py-4 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 mt-2"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                        <>
                            Reset Password
                            <ArrowRight className="w-5 h-5" />
                        </>
                    )}
                </button>
            </form>
        </AuthCard>
    )
}
