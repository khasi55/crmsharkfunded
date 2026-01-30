import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, X } from "lucide-react";

interface PrizePoolModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function PrizePoolModal({ isOpen, onClose }: PrizePoolModalProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    const prizes = [
        { rank: 1, amount: "₹2,00,000", color: "text-yellow-500", bg: "bg-yellow-50", label: "Champion" },
        { rank: 2, amount: "₹1,00,000", color: "text-slate-400", bg: "bg-slate-50", label: "Runner Up" },
        { rank: 3, amount: "₹50,000", color: "text-orange-500", bg: "bg-orange-50", label: "3rd Place" },
        { rank: 4, amount: "₹50,000", color: "text-blue-500", bg: "bg-blue-50", label: "4th Place" },
    ];

    // Use createPortal to render outside the current DOM hierarchy (at document.body)
    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden z-20"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-yellow-100 rounded-lg">
                                    <Trophy className="w-6 h-6 text-yellow-600" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900">Prize Pool</h2>
                                    <p className="text-xs text-slate-500 font-medium">Total Rewards distribution</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-3">
                            {prizes.map((prize) => (
                                <div
                                    key={prize.rank}
                                    className={`flex items-center justify-between p-4 rounded-xl border border-slate-100 ${prize.bg} hover:scale-[1.02] transition-transform`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm ${prize.rank === 1 ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-500/30' : 'bg-white border border-slate-200 text-slate-600'}`}>
                                            #{prize.rank}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className={`text-sm font-bold ${prize.color}`}>{prize.label}</span>
                                            <span className="text-xs text-slate-500 font-medium">Cash Reward</span>
                                        </div>
                                    </div>
                                    <div className="text-lg font-bold text-slate-900 font-mono">
                                        {prize.amount}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Footer */}
                        <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">

                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
}
