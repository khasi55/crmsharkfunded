"use client";

import { useState, useEffect } from "react";
import { X, Copy, Check, Share2, Globe, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    account: {
        id: string;
        login: number;
        is_public?: boolean;
        share_token?: string;
    } | null;
    onToggleSharing: (enabled: boolean) => Promise<void>;
    isSharingLoading: boolean;
}

export default function ShareModal({ isOpen, onClose, account, onToggleSharing, isSharingLoading }: ShareModalProps) {
    const [copied, setCopied] = useState(false);
    const [shareUrl, setShareUrl] = useState("");

    useEffect(() => {
        if (typeof window !== 'undefined' && account?.share_token) {
            setShareUrl(`${window.location.origin}/p/${account.share_token}`);
        }
    }, [account?.share_token]);

    const handleCopy = () => {
        if (!shareUrl) return;
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!isOpen || !account) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                            onClick={onClose}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
                        >
                            {/* Header */}
                            <div className="px-6 py-5 flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900">Share Dashboard</h2>
                                    <p className="text-sm text-slate-500 font-medium">#{account.login}</p>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 hover:text-slate-700 transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="px-6 pb-6">
                                <div className="h-px bg-slate-100 w-full mb-6" />

                                {/* Enable Sharing Toggle */}
                                <div className="flex items-center justify-between py-4 group">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-10 h-10 rounded-xl flex items-center justify-center transition-colors shadow-sm",
                                            account.is_public ? "bg-blue-50 text-blue-600" : "bg-slate-50 text-slate-400"
                                        )}>
                                            {account.is_public ? <Globe size={20} /> : <Lock size={20} />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900 leading-tight">Enable sharing</p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => onToggleSharing(!account.is_public)}
                                        disabled={isSharingLoading}
                                        className={cn(
                                            "relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                                            account.is_public ? "bg-blue-600" : "bg-slate-200",
                                            isSharingLoading && "opacity-50 cursor-not-allowed"
                                        )}
                                    >
                                        <motion.div
                                            animate={{ x: account.is_public ? 26 : 2 }}
                                            className="absolute top-1 left-0 w-4 h-4 bg-white rounded-full shadow-sm"
                                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                        />
                                    </button>
                                </div>

                                {/* Share Link */}
                                <AnimatePresence>
                                    {account.is_public && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: "auto" }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="mt-6 overflow-hidden"
                                        >
                                            <p className="text-sm font-bold text-slate-900 mb-3">Share Link</p>
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-600 truncate font-medium">
                                                    {shareUrl || "Generating link..."}
                                                </div>
                                                <button
                                                    onClick={handleCopy}
                                                    className={cn(
                                                        "p-3 rounded-xl border transition-all duration-200 flex-shrink-0",
                                                        copied
                                                            ? "bg-green-50 border-green-200 text-green-600"
                                                            : "bg-white border-slate-200 text-slate-400 hover:text-slate-900 hover:border-slate-300 shadow-sm"
                                                    )}
                                                >
                                                    {copied ? <Check size={20} /> : <Copy size={20} />}
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <div className="mt-8 text-center px-4">
                                    <p className="text-sm text-slate-500 leading-relaxed font-medium">
                                        Share links allow others to view your trading dashboard and performance metrics.
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
