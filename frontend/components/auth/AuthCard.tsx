'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
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
        <div className="min-h-screen w-full flex items-center justify-center bg-[#EDF6FE] p-4 sm:p-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md"
            >
                {/* Logo */}
                <Link href="/dashboard" className="flex items-center justify-center gap-3 mb-8">
                    <div className="relative w-10 h-10 shrink-0">
                        <Image
                            src="/shark-icon.svg"
                            alt="SharkFunded"
                            fill
                            className="object-contain"
                            priority
                        />
                    </div>
                    <span className="text-2xl font-black text-slate-900 tracking-tight">
                        SharkFunded
                    </span>
                </Link>

                {/* Card */}
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 sm:p-10 relative">
                    {backButton && (
                        <Link href="/" className="absolute top-6 left-6 text-slate-400 hover:text-slate-900 transition-colors">
                            <ChevronLeft size={24} />
                        </Link>
                    )}

                    <div className="mb-6 text-center">
                        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{title}</h2>
                        {subtitle && <p className="mt-2 text-slate-600 text-sm">{subtitle}</p>}
                    </div>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mb-5 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-600 text-sm"
                        >
                            <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                            {error}
                        </motion.div>
                    )}

                    {children}

                    {(footerText && footerLinkText && footerLinkHref) && (
                        <div className="mt-6 text-center text-sm text-slate-600">
                            {footerText}{' '}
                            <Link
                                href={footerLinkHref}
                                className="text-blue-600 hover:text-blue-700 font-semibold transition-colors"
                            >
                                {footerLinkText}
                            </Link>
                        </div>
                    )}
                </div>

                <p className="mt-4 text-center text-xs text-slate-500">
                    © 2024 SharkFunded. All rights reserved.
                </p>
            </motion.div>
        </div>
    )
}
