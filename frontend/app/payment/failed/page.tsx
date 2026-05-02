'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { X, RefreshCcw, Home, AlertCircle, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

function FailedContent() {
    const searchParams = useSearchParams();
    const orderId = searchParams.get('orderId');

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#050505] text-white p-6 overflow-hidden relative">
            {/* Background Glows */}
            <div className="absolute top-1/4 -right-20 w-80 h-80 bg-red-600/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-1/4 -left-20 w-80 h-80 bg-orange-600/10 rounded-full blur-[120px] pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-xl w-full"
            >
                {/* Glass Card */}
                <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-orange-600 rounded-3xl blur opacity-20 group-hover:opacity-30 transition duration-1000"></div>
                    <div className="relative bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 md:p-12 text-center shadow-2xl backdrop-blur-xl">

                        <motion.div
                            initial={{ rotate: -10, scale: 0 }}
                            animate={{ rotate: 0, scale: 1 }}
                            transition={{ type: "spring", damping: 12, stiffness: 200 }}
                            className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-lg shadow-red-500/20"
                        >
                            <X className="w-10 h-10 text-white" strokeWidth={3} />
                        </motion.div>

                        <h1 className="text-3xl md:text-4xl font-extrabold mb-3 tracking-tight">
                            Payment Unsuccessful
                        </h1>
                        <p className="text-gray-400 mb-8 max-w-sm mx-auto text-sm leading-relaxed">
                            Something went wrong while processing your payment. Your order <span className="text-white font-mono font-bold bg-white/5 px-2 py-0.5 rounded">{orderId || 'SF-REF-001'}</span> has not been completed.
                        </p>

                        {/* Error Context Box */}
                        <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-4 mb-8 text-left flex items-start gap-4">
                            <div className="mt-0.5 bg-red-500/10 p-2 rounded-lg">
                                <AlertCircle className="w-4 h-4 text-red-500" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-red-200 uppercase tracking-wide">Next Steps</h4>
                                <p className="text-xs text-red-100/60 leading-relaxed mt-1">
                                    Please check your payment method details and ensure sufficient funds. If your card was charged, contact support with your Order ID.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Link
                                href="/checkoutpage"
                                className="flex items-center justify-center gap-2 bg-white text-black font-bold py-4 rounded-2xl hover:bg-gray-200 transition-all group"
                            >
                                <RefreshCcw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                                <span>Try Again</span>
                            </Link>

                            <Link
                                href="/dashboard"
                                className="flex items-center justify-center gap-2 bg-white/5 border border-white/10 text-white font-bold py-4 rounded-2xl hover:bg-white/10 transition-all"
                            >
                                <Home className="w-4 h-4" />
                                <span>Dashboard</span>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Support Link */}
                <p className="mt-8 text-center text-gray-500 text-xs">
                    Need help? <Link href="/support" className="text-blue-400 hover:text-blue-300 transition-colors underline underline-offset-4 decoration-blue-400/30">Contact our 24/7 Support Team</Link>
                </p>

                {/* Security Footer */}
                <div className="mt-12 flex items-center justify-center gap-4 text-gray-600 opacity-50">
                    <ShieldAlert className="w-4 h-4" />
                    <span className="text-[10px] uppercase tracking-[0.2em] font-bold">Secure Processing Zone</span>
                </div>
            </motion.div>
        </div>
    );
}

export default function PaymentFailedPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#050505] flex items-center justify-center text-white"><div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" /></div>}>
            <FailedContent />
        </Suspense>
    );
}
