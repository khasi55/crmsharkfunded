"use client";

import { useState, useRef } from "react";
import { format } from "date-fns";
import { Award, CheckCircle, Shield, Eye, X, Download, Calendar } from "lucide-react";
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
        <div className="space-y-12">

            {/* Grid */}
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
                        whileHover={{ y: -5, transition: { duration: 0.2 } }}
                        className="group relative rounded-2xl border border-white/5 bg-[#0a0f1c] hover:border-[#0055FF]/30 transition-all duration-300 overflow-hidden"
                    >
                        {/* Preview Header */}
                        <div className="aspect-[1.5] relative flex items-center justify-center overflow-hidden bg-[#050810]">

                            <div className="relative z-10 w-[85%] h-[80%] border border-white/5 rounded-xl bg-[#0a0f1c] flex flex-col items-center justify-center text-center p-6 shadow-sm group-hover:shadow-md transition-shadow duration-300">
                                <Award size={40} className="text-[#007AFF] mb-3" />
                                <h3 className="text-white font-serif text-xl tracking-widest mb-2">CERTIFICATE</h3>
                                <div className="h-0.5 w-8 bg-[#007AFF] mb-3" />
                                <p className="text-gray-500 text-[10px] font-mono uppercase tracking-widest">
                                    {payout.id.slice(0, 8)}
                                </p>
                            </div>
                        </div>

                        {/* Details */}
                        <div className="p-6 bg-[#0a0f1c]">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <p className="text-xs font-semibold text-[#007AFF] uppercase tracking-wider mb-1">
                                        Payout Verified
                                    </p>
                                    <h3 className="font-bold text-2xl text-white">
                                        ${parseFloat(payout.amount).toLocaleString()}
                                    </h3>
                                </div>
                                <div className="bg-[#007AFF]/10 p-2 rounded-lg">
                                    <CheckCircle size={20} className="text-[#007AFF]" />
                                </div>
                            </div>

                            <div className="flex items-center justify-between text-sm text-gray-500 mb-6">
                                <span className="flex items-center gap-1.5">
                                    <Calendar size={14} />
                                    {format(new Date(payout.processed_at || payout.created_at), "MMM dd, yyyy")}
                                </span>
                            </div>

                            {/* Action: Open Modal */}
                            <button
                                onClick={() => setSelectedPayout(payout)}
                                className="w-full py-3 rounded-xl bg-[#007AFF] hover:bg-[#0060C9] text-white text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2"
                            >
                                <Eye size={16} />
                                View Certificate
                            </button>
                        </div>
                    </motion.div>
                ))}
            </motion.div>

            {/* Empty State */}
            {payouts.length === 0 && (
                <div className="text-center py-20 bg-gradient-to-b from-white/5 to-transparent rounded-3xl border border-white/10 backdrop-blur-sm">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Award className="text-gray-500" size={40} />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">No Certificates Yet</h3>
                    <p className="text-gray-400 max-w-md mx-auto mb-8">
                        Complete your first payout to see your trophies here.
                    </p>
                </div>
            )}

            {/* Modal Overlay */}
            <AnimatePresence>
                {selectedPayout && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedPayout(null)}
                            className="absolute inset-0 bg-black/90 backdrop-blur-md cursor-pointer"
                        />

                        {/* Modal Content */}
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            transition={{ type: "spring", stiffness: 300, damping: 25 }}
                            className="relative w-full max-w-5xl bg-[#0a0f1c] border border-white/10 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col max-h-[95vh]"
                        >
                            {/* Modal Header */}
                            <div className="flex items-center justify-between p-6 border-b border-white/10 bg-[#050810]/80 backdrop-blur-lg z-50">
                                <div>
                                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                        <Award className="text-[#007AFF]" size={20} />
                                        Official Certificate
                                    </h2>
                                    <p className="text-sm text-gray-400 mt-1">
                                        Verified by Shark Funded • {format(new Date(selectedPayout.processed_at || selectedPayout.created_at), "MMMM dd, yyyy")}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => downloadRef.current?.download()}
                                        className="px-4 py-2 rounded-lg bg-[#007AFF] hover:bg-[#0060C9] text-white text-sm font-bold transition-all flex items-center gap-2"
                                    >
                                        <Download size={16} />
                                        Download
                                    </button>
                                    <button
                                        onClick={() => setSelectedPayout(null)}
                                        className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all hover:rotate-90"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Modal Body */}
                            <div className="flex-1 overflow-y-auto p-4 md:p-12 bg-[#020408] flex items-center justify-center">
                                <div className="w-full shadow-2xl relative group max-w-4xl">
                                    <div className="relative rounded-lg overflow-hidden ring-1 ring-white/10">
                                        <PayoutCertificate
                                            ref={downloadRef}
                                            name={userName}
                                            amount={parseFloat(selectedPayout.amount)}
                                            date={selectedPayout.processed_at || selectedPayout.created_at}
                                            transactionId={selectedPayout.transaction_id || selectedPayout.id}
                                        />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
