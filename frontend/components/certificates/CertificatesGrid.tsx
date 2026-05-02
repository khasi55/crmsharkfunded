"use client";

import { useState, useRef } from "react";
import { format } from "date-fns";
import { Award, CheckCircle2, Eye, X, Download, Calendar, ShieldCheck, Trophy } from "lucide-react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import PayoutCertificate, { PayoutCertificateRef } from "@/components/certificates/PayoutCertificate";
import ChallengeCertificate, { ChallengeCertificateRef } from "@/components/certificates/ChallengeCertificate";

interface Payout {
    id: string;
    amount: string; // numeric string from DB
    created_at: string;
    processed_at: string | null;
    status: string;
    transaction_id?: string;
    certificate_type: 'payout';
}

interface Achievement {
    id: string;
    title: string;
    description: string;
    issued_at: string;
    type: string; // 'achievement'
    certificate_type: 'achievement';
}

type CertificateItem = Payout | Achievement;

interface UserProfile {
    display_name?: string;
    first_name?: string;
    last_name?: string;
    full_name?: string;
}

interface CertificatesGridProps {
    payouts: any[];
    certificates: any[];
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

export default function CertificatesGrid({ payouts, certificates, profile }: CertificatesGridProps) {
    const [selectedItem, setSelectedItem] = useState<CertificateItem | null>(null);
    const downloadRef = useRef<any>(null);

    // 1. Tag and Merge items
    const taggedPayouts = payouts.map(p => ({ ...p, certificate_type: 'payout' as const }));
    const taggedCertificates = certificates.map(c => ({ ...c, certificate_type: 'achievement' as const }));
    
    const allItems: CertificateItem[] = [...taggedPayouts, ...taggedCertificates].sort((a, b) => {
        const dateA = 'processed_at' in a ? (a.processed_at || a.created_at) : a.issued_at;
        const dateB = 'processed_at' in b ? (b.processed_at || b.created_at) : b.issued_at;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

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
                    Professional proof of your Demo Funded trading success.
                </p>
            </div>

            {/* Grid of Certificates */}
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
                {allItems.map((item) => (
                    <motion.div
                        key={item.id}
                        variants={itemVariants}
                        layoutId={item.id}
                        onClick={() => setSelectedItem(item)}
                        whileHover={{ y: -8, scale: 1.01 }}
                        className="cursor-pointer group relative aspect-[1.4] rounded-2xl overflow-hidden shadow-2xl transition-all duration-500 bg-[#050923] ring-1 ring-white/10 hover:ring-blue-500/50"
                    >
                        {/* Premium Certificate Preview */}
                        <div className="absolute inset-x-0 inset-y-0 p-8 flex flex-col items-center justify-center text-center">
                            {/* Animated Gradient Background */}
                            <div className={`absolute inset-0 bg-gradient-to-br transition-opacity group-hover:opacity-90 ${
                                item.certificate_type === 'achievement' 
                                ? 'from-[#0A1235] via-[#1A2255] to-[#0A1235]' 
                                : 'from-[#050923] via-[#0A1235] to-[#050923]'
                            }`} />

                            {/* Decorative Grid Pattern */}
                            <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] pointer-events-none" />

                            {/* Decorative Gold/Blue Frame */}
                            <div className={`absolute inset-4 border rounded-xl pointer-events-none ${
                                item.certificate_type === 'achievement' ? 'border-amber-500/20' : 'border-blue-500/20'
                            }`} />

                            {/* Content */}
                            <div className="relative z-10 flex flex-col items-center w-full h-full">
                                {item.certificate_type === 'achievement' ? (
                                    <Trophy className="text-amber-500 mb-4 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]" size={36} />
                                ) : (
                                    <Award className="text-blue-500 mb-4 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]" size={36} />
                                )}

                                <h3 className="text-white font-serif text-xl tracking-[0.3em] uppercase mb-1 opacity-90 text-center">
                                    Certificate
                                </h3>
                                <p className={`${
                                    item.certificate_type === 'achievement' ? 'text-amber-400/60' : 'text-blue-400/60'
                                } text-[10px] uppercase font-black tracking-[0.4em] mb-6`}>
                                    {item.certificate_type === 'achievement' ? 'Achievement Unlocked' : 'Official Payout'}
                                </p>

                                {/* Title/Amount */}
                                <div className="mb-auto py-2">
                                    <h1 className="text-3xl lg:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-blue-400/80 font-sans tracking-tight">
                                        {item.certificate_type === 'achievement' ? (item as Achievement).title : `$${parseFloat((item as Payout).amount).toLocaleString()}`}
                                    </h1>
                                </div>

                                {/* Name & Details */}
                                <div className="mt-auto space-y-2">
                                    <div className="text-white font-serif italic text-sm opacity-80">
                                        Presented to <span className="font-semibold text-white opacity-100">{userName}</span>
                                    </div>

                                    <div className="flex items-center justify-center gap-3 text-[10px] font-bold tracking-widest text-slate-500 uppercase">
                                        <span>{format(new Date(
                                            item.certificate_type === 'achievement' 
                                            ? (item as Achievement).issued_at 
                                            : ((item as Payout).processed_at || (item as Payout).created_at)
                                        ), "MMM dd, yyyy")}</span>
                                        <span className="w-1 h-1 bg-slate-700 rounded-full" />
                                        <span>ID: {item.id.slice(0, 6)}</span>
                                    </div>
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
            {allItems.length === 0 && (
                <div className="text-center py-24 bg-[#0B0F17]/50 rounded-3xl border border-dashed border-white/10">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Award className="text-gray-500" size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-1">No Certificates Yet</h3>
                    <p className="text-gray-600 text-sm max-w-sm mx-auto">
                        Your trading achievements and payouts will be displayed here as official certificates.
                    </p>
                </div>
            )}

            {/* Modal */}
            <AnimatePresence>
                {selectedItem && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedItem(null)}
                            className="absolute inset-0 bg-black/90 backdrop-blur-md cursor-pointer"
                        />

                        <motion.div
                            layoutId={selectedItem.id}
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
                                        onClick={() => setSelectedItem(null)}
                                        className="p-2 text-gray-400 hover:text-white transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Canvas Container */}
                            <div className="p-8 md:p-12 bg-[#05080F] flex items-center justify-center overflow-auto max-h-[85vh]">
                                <div className="w-full max-w-4xl shadow-2xl">
                                    {selectedItem.certificate_type === 'payout' ? (
                                        <PayoutCertificate
                                            ref={downloadRef}
                                            name={userName}
                                            amount={parseFloat((selectedItem as Payout).amount)}
                                            date={(selectedItem as Payout).processed_at || (selectedItem as Payout).created_at}
                                            transactionId={(selectedItem as Payout).transaction_id || selectedItem.id}
                                        />
                                    ) : (
                                        <ChallengeCertificate
                                            ref={downloadRef}
                                            name={userName}
                                            type={(selectedItem as any).title}
                                            date={(selectedItem as any).issued_at}
                                            certificateId={selectedItem.id}
                                            balance={(selectedItem as any).challenges?.balance}
                                        />
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
