'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react'
import AuthCard from '@/components/auth/AuthCard'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()
    const supabase = createClient()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (error) {
                throw error
            }

            router.push('/dashboard') // Explicitly redirect to dashboard
            router.refresh()
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <AuthCard
            title="Welcome Back"
            subtitle="Sign in to your trading account"
            footerText="Don't have an account?"
            footerLinkText="Sign up"
            footerLinkHref="/signup"
            error={error}
        >
            <form onSubmit={handleLogin} className="space-y-5">
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
                            placeholder="trader@sharkfunded.com"
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <div className="flex items-center justify-between ml-1">
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider" htmlFor="password">Password</label>
                        <Link href="/forgot-password" className="text-xs text-[#00E5FF] hover:text-[#00c2d9] transition-colors font-medium">
                            Forgot Password?
                        </Link>
                    </div>
                    <div className="relative group">
                        <Lock className="absolute left-4 top-3.5 w-5 h-5 text-gray-500 group-focus-within:text-[#00E5FF] transition-colors" />
                        <input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-[#0a0f1c] border border-gray-800 rounded-xl pl-12 pr-10 py-3.5 text-white focus:outline-none focus:border-[#00E5FF]/50 focus:ring-4 focus:ring-[#00E5FF]/10 transition-all placeholder:text-gray-700 font-medium"
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

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-[#00E5FF] to-[#0099FF] hover:from-[#00c2d9] hover:to-[#0088e6] text-[#0a0f1c] font-bold py-4 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 mt-2"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                        <>
                            Log In
                            <ArrowRight className="w-5 h-5" />
                        </>
                    )}
                </button>
            </form>
        </AuthCard>
    )
}
