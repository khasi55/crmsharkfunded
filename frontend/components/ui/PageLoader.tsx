"use client";

import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp } from "lucide-react";

interface PageLoaderProps {
    isLoading: boolean;
    text?: string;
}

export default function PageLoader({ isLoading, text = "LOADING..." }: PageLoaderProps) {
    return (
        <AnimatePresence mode="wait">
            {isLoading && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#020617]/90 backdrop-blur-md"
                >
                    <div className="relative flex flex-col items-center">
                        <div className="relative w-24 h-24 mb-8">
                            <div className="absolute inset-0 border-4 border-blue-500/10 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-t-blue-500 rounded-full animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <TrendingUp className="w-10 h-10 text-blue-500 animate-pulse" />
                            </div>
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2 tracking-widest">
                            {text.toUpperCase()}
                        </h2>
                        <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Please wait while we fetch your live data</p>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
