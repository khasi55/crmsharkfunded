"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Award, Download, Share2, Medal, Search, CheckCircle, Lock, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

// Mock Data matching the new SQL Schema
const mockCertificates = [
    {
        id: "CERT-2024-88A9",
        title: "Funded Trader",
        description: "Passed Phase 2 on $100k Account",
        type: "achievement",
        issued_at: "2024-11-12",
        image: "/cert-funded.png" // Placeholder
    },
    {
        id: "CERT-2024-99B1",
        title: "Payout Verified",
        description: "First Withdrawal $4,250.00",
        type: "payout",
        issued_at: "2024-12-01",
        image: "/cert-payout.png"
    },
    // Locked examples
    {
        id: "locked-1",
        title: "Elite Trader",
        description: "Scale up to $500k",
        type: "trophy",
        issued_at: null,
        status: "locked"
    }
];

export default function CertificatesPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [isVerifying, setIsVerifying] = useState(false);

    // Mock Verification Logic
    const handleVerify = (e: React.FormEvent) => {
        e.preventDefault();
        setIsVerifying(true);
        setTimeout(() => setIsVerifying(false), 1500);
    };

    return (
        <div className="space-y-12 max-w-6xl mx-auto p-6 min-h-screen font-sans">

            {/* Header & Verification Section */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-white/5 pb-8">
                <div>
                    <h1 className="text-4xl font-black text-white flex items-center gap-3 tracking-tight mb-2">
                        <Award className="text-[#00E5FF] drop-shadow-[0_0_15px_rgba(0,229,255,0.5)]" size={36} />
                        Certificates
                    </h1>
                    <p className="text-gray-400 font-medium">Verify and download your official trading records.</p>
                </div>

                {/* Public Verification Search */}
                <form onSubmit={handleVerify} className="w-full md:w-auto">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-[#00E5FF] transition-colors" />
                        <input
                            type="text"
                            placeholder="Verify Certificate ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full md:w-[320px] bg-[#0a0f1c] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-[#00E5FF] transition-all placeholder:text-gray-600"
                        />
                        <button disabled={isVerifying} className="absolute right-2 top-2 bottom-2 px-3 bg-[#00E5FF]/10 text-[#00E5FF] rounded-lg text-xs font-bold hover:bg-[#00E5FF] hover:text-black transition-all disabled:opacity-50">
                            {isVerifying ? "Verifying..." : "Check"}
                        </button>
                    </div>
                </form>
            </div>

            {/* Certificates Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {mockCertificates.map((cert, idx) => {
                    const isLocked = cert.status === "locked";

                    return (
                        <motion.div
                            key={cert.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className={cn(
                                "group relative rounded-3xl border transition-all duration-300 overflow-hidden",
                                isLocked
                                    ? "bg-[#050810]/50 border-white/5 opacity-70 hover:opacity-100"
                                    : "bg-[#0a0f1c] border-white/10 hover:border-[#00E5FF]/30 hover:shadow-[0_0_30px_rgba(0,229,255,0.05)]"
                            )}
                        >
                            {/* Certificate Visual Preview */}
                            <div className={cn(
                                "aspect-[1.4] relative p-8 flex items-center justify-center overflow-hidden",
                                isLocked ? "bg-black/40" : "bg-gradient-to-br from-[#050810] to-[#0a0f1c]"
                            )}>
                                {/* Background Pattern */}
                                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#0055FF]/20 via-transparent to-transparent" />

                                {isLocked ? (
                                    <div className="text-center relative z-10">
                                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
                                            <Lock className="text-gray-500" size={28} />
                                        </div>
                                        <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Locked</p>
                                    </div>
                                ) : (
                                    <div className="relative z-10 w-full h-full border-4 border-[#00E5FF]/20 rounded-xl flex flex-col items-center justify-center text-center p-4 backdrop-blur-sm">
                                        {cert.type === 'achievement' ? (
                                            <Medal size={48} className="text-[#FFD700] mb-4 drop-shadow-[0_0_10px_rgba(255,215,0,0.5)]" />
                                        ) : (
                                            <Award size={48} className="text-[#00E5FF] mb-4 drop-shadow-[0_0_10px_rgba(0,229,255,0.5)]" />
                                        )}

                                        <h3 className="text-white font-serif text-2xl tracking-wider mb-1">SHARK FUNDED</h3>
                                        <div className="h-px w-12 bg-[#00E5FF]/50 my-2" />
                                        <p className="text-gray-300 font-bold text-sm uppercase tracking-wide">{cert.title}</p>
                                        <p className="text-[#00E5FF] text-[10px] mt-2 font-mono">{cert.id}</p>
                                    </div>
                                )}
                            </div>

                            {/* Details Footer */}
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className={cn("font-bold text-lg mb-1", isLocked ? "text-gray-500" : "text-white")}>
                                            {cert.title}
                                        </h3>
                                        <p className="text-sm text-gray-500 line-clamp-2">{cert.description}</p>
                                    </div>
                                    {!isLocked && (
                                        <div className="bg-[#00E5FF]/10 p-2 rounded-lg">
                                            <CheckCircle size={18} className="text-[#00E5FF]" />
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className={cn(
                                    "flex items-center gap-3 pt-4 border-t border-white/5 transition-all",
                                    isLocked ? "opacity-30 pointer-events-none" : "opacity-100"
                                )}>
                                    <button className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 group/btn">
                                        <Download size={14} className="text-gray-400 group-hover/btn:text-white" />
                                        PDF
                                    </button>
                                    <button className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 group/btn">
                                        <Share2 size={14} className="text-gray-400 group-hover/btn:text-white" />
                                        Share
                                    </button>
                                </div>

                                {!isLocked && (
                                    <div className="mt-4 flex items-center justify-center gap-1.5 opacity-40">
                                        <Shield size={10} className="text-[#00E5FF]" />
                                        <span className="text-[10px] text-[#00E5FF] font-medium tracking-wide">Authenticity Verified</span>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
