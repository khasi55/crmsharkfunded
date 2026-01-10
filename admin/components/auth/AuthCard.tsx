'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { ChevronLeft } from 'lucide-react'

interface AuthCardProps {
    children: React.ReactNode
    title: string
    subtitle?: string
    footerText?: string
    footerLinkText?: string
    footerLinkHref?: string
    error?: string | null
    className?: string
    backButton?: boolean
}

export default function AuthCard({
    children,
    title,
    subtitle,
    footerText,
    footerLinkText,
    footerLinkHref,
    error,
    className,
    backButton
}: AuthCardProps) {
    return (
        <div className="min-h-screen w-full flex bg-[#020408] relative overflow-hidden font-sans">

            {/* Global Background Ambience */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#0055FF]/10 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#00E5FF]/5 rounded-full blur-[150px]" />
            </div>

            {/* LEFT SIDE - VISUAL BRANDING (Hidden on mobile) */}
            <div className="hidden lg:flex w-[50%] xl:w-[55%] relative flex-col justify-between p-16 overflow-hidden border-r border-white/5 bg-[#050810]">
                {/* Visual Background */}
                <div className="absolute inset-0 z-0 opacity-80 mix-blend-screen">
                    <Image
                        src="/auth-bg.png"
                        alt="Shark Funded Background"
                        fill
                        className="object-cover"
                        priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#020408] via-transparent to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#020408]/80 to-transparent" />
                </div>

                {/* Content */}
                <div className="relative z-10 h-full flex flex-col justify-center">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.6 }}
                        className="absolute top-16 left-16 w-48 h-16"
                    >
                        <Image
                            src="/logo.png"
                            alt="Shark Funded"
                            fill
                            className="object-contain object-left"
                            priority
                        />
                    </motion.div>

                    <div className="space-y-8 mt-20">
                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3, duration: 0.6 }}
                            className="text-6xl xl:text-7xl font-bold text-white tracking-tighter leading-[1.1]"
                        >
                            Future of <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00E5FF] to-[#0099FF] animate-gradient-x glow-text">
                                Prop Trading
                            </span>
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4, duration: 0.6 }}
                            className="text-xl text-gray-400 max-w-lg leading-relaxed font-light"
                        >
                            Experience lightning-fast payouts, raw spreads, and the most advanced trading dashboard in the industry.
                        </motion.p>
                    </div>

                    {/* Stats */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5, duration: 0.8 }}
                        className="mt-auto pt-12 border-t border-white/10 flex gap-16"
                    >
                        <div>
                            <div className="text-4xl font-bold text-white tracking-tight">$100M+</div>
                            <div className="text-sm font-medium text-[#00E5FF] uppercase tracking-wider mt-1">Payouts Processed</div>
                        </div>
                        <div>
                            <div className="text-4xl font-bold text-white tracking-tight">0.0s</div>
                            <div className="text-sm font-medium text-[#00E5FF] uppercase tracking-wider mt-1">Latency Execution</div>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* RIGHT SIDE - FORM */}
            <div className="w-full lg:w-[50%] xl:w-[45%] flex items-center justify-center p-6 sm:p-12 relative z-20 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4 }}
                    className="w-full max-w-[440px]"
                >
                    {/* Mobile Logo */}
                    <div className="lg:hidden flex justify-center mb-10">
                        <div className="relative w-40 h-12">
                            <Image
                                src="/logo.png"
                                alt="Shark Funded"
                                fill
                                className="object-contain"
                            />
                        </div>
                    </div>

                    <div className="glass-panel p-8 sm:p-10 rounded-3xl shadow-2xl relative overflow-hidden bg-[#0a0f1c] border-white/10">
                        {backButton && (
                            <Link href="/" className="absolute top-6 left-6 text-gray-400 hover:text-white transition-colors">
                                <ChevronLeft size={24} />
                            </Link>
                        )}

                        <div className="mb-8 text-center lg:text-left">
                            <h2 className="text-3xl font-bold text-white tracking-tight">{title}</h2>
                            {subtitle && <p className="mt-3 text-gray-400 text-lg font-light">{subtitle}</p>}
                        </div>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm"
                            >
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                                {error}
                            </motion.div>
                        )}

                        <div className="relative">
                            {children}
                        </div>

                        {(footerText && footerLinkText && footerLinkHref) && (
                            <div className="mt-8 text-center text-sm text-gray-500">
                                {footerText}{' '}
                                <Link
                                    href={footerLinkHref}
                                    className="text-[#00E5FF] hover:text-white font-semibold transition-colors relative group"
                                >
                                    {footerLinkText}
                                    <span className="absolute -bottom-1 left-0 w-0 h-px bg-[#00E5FF] transition-all group-hover:w-full" />
                                </Link>
                            </div>
                        )}
                        <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-center gap-6 text-gray-500">
                            <div className="text-xs font-bold uppercase tracking-widest opacity-50">Authorized Partner</div>
                        </div>
                    </div>
                    <div className="mt-8 text-center">
                        <p className="text-xs text-gray-500 font-medium">
                            By continuing, you agree to our <a href="#" className="underline hover:text-[#00E5FF] transition-colors">Terms of Service</a> and <a href="#" className="underline hover:text-[#00E5FF] transition-colors">Privacy Policy</a>.
                        </p>
                    </div>

                </motion.div>
            </div>
        </div>
    )
}
