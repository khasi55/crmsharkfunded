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
            <div className="flex flex-col gap-2 mb-10">
                <div className="flex items-center gap-3">
                    <div className="w-1.5 h-8 bg-blue-600 rounded-full" />
                    <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">
                        My Certificates
                    </h2>
                </div>
                <p className="text-slate-500 text-base font-medium max-w-2xl">
                    Professional, blockchain-verified proof of your SharkFunded trading success.
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
                        whileHover={{ y: -8, scale: 1.01 }}
                        className="cursor-pointer group relative aspect-[1.4] rounded-2xl overflow-hidden shadow-2xl transition-all duration-500 bg-[#050923] ring-1 ring-white/10 hover:ring-blue-500/50"
                    >
                        {/* Premium Certificate Preview */}
                        <div className="absolute inset-x-0 inset-y-0 p-8 flex flex-col items-center justify-center text-center">
                            {/* Animated Gradient Background */}
                            <div className="absolute inset-0 bg-gradient-to-br from-[#050923] via-[#0A1235] to-[#050923] group-hover:opacity-90 transition-opacity" />

                            {/* Decorative Grid Pattern */}
                            <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] pointer-events-none" />

                            {/* Decorative Gold Frame */}
                            <div className="absolute inset-4 border border-blue-500/20 rounded-xl pointer-events-none" />
                            <div className="absolute inset-[1.25rem] border-[0.5px] border-white/5 rounded-lg pointer-events-none" />

                            {/* Content */}
                            <div className="relative z-10 flex flex-col items-center w-full h-full">
                                <Award className="text-blue-500 mb-4 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]" size={36} />

                                <h3 className="text-white font-serif text-xl tracking-[0.3em] uppercase mb-1 opacity-90">
                                    Certificate
                                </h3>
                                <p className="text-blue-400/60 text-[10px] uppercase font-black tracking-[0.4em] mb-6">
                                    Official Payout
                                </p>

                                {/* Amount with Premium Gradient */}
                                <div className="mb-auto py-2">
                                    <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-blue-400/80 font-sans tracking-tight">
                                        ${parseFloat(payout.amount).toLocaleString(undefined, { minimumFractionDigits: 0 })}
                                    </h1>
                                </div>

                                {/* Name & Details */}
                                <div className="mt-auto space-y-2">
                                    <div className="text-white font-serif italic text-sm opacity-80">
                                        Presented to <span className="font-semibold text-white opacity-100">{userName}</span>
                                    </div>

                                    <div className="flex items-center gap-3 text-[10px] font-bold tracking-widest text-slate-500 uppercase">
                                        <span>{format(new Date(payout.processed_at || payout.created_at), "MMM dd, yyyy")}</span>
                                        <span className="w-1 h-1 bg-slate-700 rounded-full" />
                                        <span>ID: {payout.id.slice(0, 6)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Corner Accents */}
                            <div className="absolute top-6 right-6 z-20">
                                <div className="bg-blue-500/10 backdrop-blur-md p-2 rounded-full border border-blue-500/30 group-hover:bg-blue-500/20 transition-all">
                                    <CheckCircle2 size={16} className="text-blue-400" />
                                </div>
                            </div>
                        </div>

                        {/* High-end Hover Reveal */}
                        <div className="absolute inset-0 bg-gradient-to-t from-blue-600/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col items-center justify-end pb-8">
                            <span className="bg-white text-blue-900 px-6 py-2.5 rounded-full font-black text-xs uppercase tracking-widest flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-all duration-500 shadow-xl">
                                <Eye size={16} /> View Original
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
                    <h3 className="text-lg font-bold text-slate-900 mb-1">No Certificates Yet</h3>
                    <p className="text-gray-600 text-sm max-w-sm mx-auto">
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
