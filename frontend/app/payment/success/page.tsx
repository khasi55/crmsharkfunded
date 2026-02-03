'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Check, Loader2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

function PaymentSuccessContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [count, setCount] = useState(5);

    // Get order details from params if available
    const orderId = searchParams.get('orderId') || searchParams.get('reference_id');
    const amount = searchParams.get('amount');

    useEffect(() => {
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

        return () => clearInterval(timer);
    }, [router]);

    return (
        <div className="flex-1 flex flex-col h-full md:h-[calc(100vh-2rem)] relative w-full bg-[#EDF6FE] md:rounded-3xl md:my-4 md:mr-4 overflow-hidden border border-slate-200/50 shadow-2xl items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md w-full bg-white/80 backdrop-blur-xl border border-white/50 rounded-3xl p-8 md:p-12 text-center shadow-xl"
            >
                <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-8 relative">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: "spring" }}
                        className="absolute inset-0 bg-green-500/10 rounded-full animate-ping opacity-20"
                    />
                    <Check className="w-10 h-10 text-green-500" strokeWidth={4} />
                </div>

                <h1 className="text-3xl font-black text-[#0a0d20] mb-3 tracking-tight">Payment Successful!</h1>
                <p className="text-slate-500 mb-8 leading-relaxed font-medium">
                    Your challenge account has been created successfully. <br />
                    Welcome to the team.
                </p>

                {orderId && (
                    <div className="bg-slate-50 rounded-2xl p-6 mb-8 text-left border border-slate-100">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Order Reference</span>
                            <span className="text-sm font-mono font-bold text-slate-700 bg-white px-2 py-1 rounded border border-slate-100">{orderId}</span>
                        </div>
                        {amount && (
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Amount Paid</span>
                                <span className="text-lg font-black text-[#0a0d20]">₹{Number(amount).toLocaleString()}</span>
                            </div>
                        )}
                    </div>
                )}

                <div className="space-y-4">
                    <Link
                        href="/dashboard"
                        className="w-full bg-[#3b82f6] hover:bg-blue-600 active:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 group"
                    >
                        <span>Go to Dashboard</span>
                        <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </Link>

                    <p className="text-sm font-medium text-slate-400">
                        Redirecting automatically in <span className="text-blue-500">{count}s</span>...
                    </p>
                </div>
            </motion.div>
        </div>
    );
}

export default function PaymentSuccessPage() {
    return (
        // Wrapper matching Layout structure if needed, or simplified full screen
        <div className="min-h-screen bg-[#F8FAFC] flex p-4 md:p-0">
            {/* Note: In main layout, Sidebar handles the left part. Here we just ensure it looks good if standalone or properly wrapped */}
            <div className="flex-1 flex justify-center items-center">
                <Suspense fallback={
                    <div className="text-center text-slate-500 font-bold flex flex-col items-center gap-4">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                        <span className="text-sm tracking-widest uppercase">Verifying Payment...</span>
                    </div>
                }>
                    <PaymentSuccessContent />
                </Suspense>
            </div>
        </div>
    );
}
