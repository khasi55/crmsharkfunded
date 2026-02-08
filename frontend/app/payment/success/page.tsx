'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2, ArrowRight, Wallet, ShieldCheck, Zap } from 'lucide-react';
import Link from 'next/link';

function PaymentSuccessContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [count, setCount] = useState(10);
    const [isChecking, setIsChecking] = useState(true);

    const orderId = searchParams.get('orderId') || searchParams.get('reference_id');
    const amount = searchParams.get('amount');

    useEffect(() => {
        // Simulate a brief verification delay for "WOW" factor
        const checkTimer = setTimeout(() => {
            setIsChecking(false);
        }, 2000);

        const timer = setInterval(() => {
            setCount((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    router.push('/dashboard');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            clearTimeout(checkTimer);
            clearInterval(timer);
        };
    }, [router]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#050505] text-white p-6 overflow-hidden relative">
            {/* Background Glows */}
            <div className="absolute top-1/4 -left-20 w-80 h-80 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

            <AnimatePresence mode="wait">
                {isChecking ? (
                    <motion.div
                        key="verifying"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.1 }}
                        className="flex flex-col items-center text-center space-y-6"
                    >
                        <div className="relative">
                            <div className="w-24 h-24 border-2 border-blue-500/20 rounded-full" />
                            <motion.div
                                className="absolute inset-0 border-t-2 border-blue-500 rounded-full"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            />
                            <ShieldCheck className="absolute inset-0 m-auto w-10 h-10 text-blue-500" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold tracking-tight">Verifying Payment</h2>
                            <p className="text-gray-400 text-sm">Securing your trading credentials...</p>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="success"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-xl w-full"
                    >
                        {/* Glass Card */}
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
                            <div className="relative bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 md:p-12 text-center shadow-2xl backdrop-blur-xl">

                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", damping: 12, stiffness: 200 }}
                                    className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-8 rotate-3 shadow-lg shadow-green-500/20"
                                >
                                    <Check className="w-10 h-10 text-white" strokeWidth={3} />
                                </motion.div>

                                <h1 className="text-4xl font-extrabold mb-3 bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-400">
                                    Payment Successful!
                                </h1>
                                <p className="text-gray-400 mb-8 max-w-sm mx-auto">
                                    Your challenge account is being provisioned. Credentials will be sent to your email shortly.
                                </p>

                                {/* Order Info Grid */}
                                <div className="grid grid-cols-2 gap-4 mb-8">
                                    <div className="bg-white/5 border border-white/5 rounded-2xl p-4 text-left">
                                        <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1">Order ID</p>
                                        <p className="text-sm font-mono text-blue-400 truncate">{orderId || 'SF-GEN-001'}</p>
                                    </div>
                                    <div className="bg-white/5 border border-white/5 rounded-2xl p-4 text-left">
                                        <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1">Status</p>
                                        <div className="flex items-center gap-1.5">
                                            <Zap className="w-3 h-3 text-green-500 fill-green-500" />
                                            <p className="text-sm font-bold text-green-500 uppercase">Settled</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <Link
                                        href="/dashboard"
                                        className="flex items-center justify-center gap-2 w-full bg-white text-black font-bold py-4 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all transform shadow-xl shadow-white/10 group"
                                    >
                                        <span>Enter Trading Dashboard</span>
                                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </Link>

                                    <p className="text-xs text-gray-500 font-medium tracking-wide first-letter:uppercase">
                                        Redirecting to your dashboard in <span className="text-white tabular-nums font-bold">{count}s</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Footer Tips */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            className="mt-12 flex flex-col md:flex-row items-center justify-center gap-8 text-gray-500"
                        >
                            <div className="flex items-center gap-2">
                                <Wallet className="w-4 h-4" />
                                <span className="text-xs">Secure Checkout</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4" />
                                <span className="text-xs">Instant Provisioning</span>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function PaymentSuccessPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#050505] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        }>
            <PaymentSuccessContent />
        </Suspense>
    );
}

