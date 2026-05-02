"use client";

import { motion, AnimatePresence } from "framer-motion";

interface PageLoaderProps {
    isLoading: boolean;
    text?: string;
}

export default function PageLoader({ isLoading, text = "LOADING..." }: PageLoaderProps) {
    return (
        <AnimatePresence>
            {isLoading && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-50 bg-white/80 backdrop-blur-md flex items-center justify-center flex-col gap-4"
                >
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse"></div>
                        </div>
                    </div>
                    {text && (
                        <p className="text-blue-600 font-bold tracking-widest text-sm animate-pulse">{text}</p>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
}
