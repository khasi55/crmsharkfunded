"use client";

import { useState, useRef } from "react";
import { format } from "date-fns";
import { Award, CheckCircle2, Eye, X, Download, Calendar, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import PayoutCertificate, { PayoutCertificateRef } from "@/components/certificates/PayoutCertificate";

interface Payout {
    id: string;
    amount: string; // numeric string from DB
    created_at: string;
    processed_at: string | null;
    status: string;
    transaction_id?: string;
}

interface UserProfile {
    display_name?: string;
    first_name?: string;
    last_name?: string;
    full_name?: string;
}

interface CertificatesGridProps {
    payouts: Payout[];
    profile: UserProfile | null;
}

// Animation Variants
const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 50 } }
};

export default function CertificatesGrid({ payouts, profile }: CertificatesGridProps) {
    const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);
    const downloadRef = useRef<PayoutCertificateRef>(null);

    // Determine secure user name
    let userName = "Valued Trader";
    if (profile) {
        if (profile.display_name) userName = profile.display_name;
        else if (profile.first_name && profile.last_name) userName = `${profile.first_name} ${profile.last_name}`;
        else if (profile.full_name) userName = profile.full_name;
        else if (profile.first_name) userName = profile.first_name;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1 mb-8">
                <h2 className="text-3xl font-bold text-white flex items-center gap-2">
                    My Certificates
                </h2>
                <p className="text-gray-400 text-sm">
                    Verified proof of your trading success.
                </p>
            </div>

            {/* Grid of "Direct" Certificates */}
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
                {payouts.map((payout) => (
                    <motion.div
                        key={payout.id}
                        variants={itemVariants}
                        layoutId={payout.id}
                        onClick={() => setSelectedPayout(payout)}
                        whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                        className="cursor-pointer group relative aspect-[1.4] rounded-xl overflow-hidden shadow-2xl transition-all duration-300 ring-1 ring-white/10 hover:ring-[#3B82F6]/50 hover:shadow-[#3B82F6]/20 bg-[#000]"
                    >
                        {/* CSS-Based Certificate Preview (No Canvas overhead) */}
                        <div className="absolute inset-x-0 inset-y-0 p-6 flex flex-col items-center justify-center text-center bg-[url('/certificate-bg-pattern.png')] bg-cover bg-center">
                            {/* Decorative Border */}
                            <div className="absolute inset-3 border-2 border-[#D4AF37]/30 rounded-lg pointer-events-none" />
                            <div className="absolute inset-4 border border-[#D4AF37]/10 rounded-md pointer-events-none" />

                            {/* Header */}
                            <Award className="text-[#3B82F6] mb-3 drop-shadow-[0_0_10px_rgba(59,130,246,0.6)]" size={32} />

                            <h3 className="text-white/90 font-serif text-lg tracking-[0.2em] uppercase mb-1">
                                Certificate
                            </h3>
                            <p className="text-gray-500 text-[9px] uppercase tracking-widest mb-4">
                                Of Payout
                            </p>

                            {/* Amount */}
                            <div className="relative mb-4">
                                <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 font-sans tracking-tight">
                                    ${parseFloat(payout.amount).toLocaleString()}
                                </h1>
                            </div>

                            {/* Name & details */}
                            <div className="text-gray-400 text-xs font-serif italic mb-2">
                                Presented to {userName}
                            </div>

                            <div className="text-gray-600 text-[10px] font-mono mt-auto">
                                {format(new Date(payout.processed_at || payout.created_at), "MMM dd, yyyy")} • ID: {payout.id.slice(0, 6)}
                            </div>

                            {/* Verified Badge */}
                            <div className="absolute top-6 right-6">
                                <div className="bg-[#3B82F6]/10 p-1.5 rounded-full border border-[#3B82F6]/20">
                                    <CheckCircle2 size={14} className="text-[#3B82F6]" />
                                </div>
                            </div>
                        </div>

                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-3">
                            <span className="text-white font-medium flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                                <Eye size={18} /> View Full Detail
                            </span>
                        </div>
                    </motion.div>
                ))}
            </motion.div>

            {/* Empty State */}
            {payouts.length === 0 && (
                <div className="text-center py-24 bg-[#0B0F17]/50 rounded-3xl border border-dashed border-white/10">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Award className="text-gray-500" size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1">No Certificates Yet</h3>
                    <p className="text-gray-400 text-sm max-w-sm mx-auto">
                        Your trading achievements will be displayed here as official certificates.
                    </p>
                </div>
            )}

            {/* Modal */}
            <AnimatePresence>
                {selectedPayout && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedPayout(null)}
                            className="absolute inset-0 bg-black/90 backdrop-blur-md cursor-pointer"
                        />

                        <motion.div
                            layoutId={selectedPayout.id}
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative w-full max-w-5xl bg-[#0B0F17] rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10 flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Toolbar */}
                            <div className="flex items-center justify-between px-6 py-4 bg-[#0F1623] border-b border-white/5">
                                <h3 className="text-white font-semibold flex items-center gap-2">
                                    <ShieldCheck className="text-[#3B82F6]" size={18} />
                                    Verified Certificate
                                </h3>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => downloadRef.current?.download()}
                                        className="px-4 py-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors"
                                    >
                                        <Download size={16} />
                                        Download PNG
                                    </button>
                                    <button
                                        onClick={() => setSelectedPayout(null)}
                                        className="p-2 text-gray-400 hover:text-white transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Canvas Container */}
                            <div className="p-8 md:p-12 bg-[#05080F] flex items-center justify-center overflow-auto max-h-[85vh]">
                                <div className="w-full max-w-4xl shadow-2xl">
                                    <PayoutCertificate
                                        ref={downloadRef}
                                        name={userName}
                                        amount={parseFloat(selectedPayout.amount)}
                                        date={selectedPayout.processed_at || selectedPayout.created_at}
                                        transactionId={selectedPayout.transaction_id || selectedPayout.id}
                                    />
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
