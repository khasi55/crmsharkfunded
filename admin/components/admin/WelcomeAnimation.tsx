"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface WelcomeAnimationProps {
    user: {
        full_name: string;
        email: string;
    };
}

export function WelcomeAnimation({ user }: WelcomeAnimationProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Check if welcome has been shown in this session
        const hasShownWelcome = sessionStorage.getItem("hasShownWelcome");
        
        // For debugging, we can add a check for a query parameter
        const forceShow = new URLSearchParams(window.location.search).get("welcome") === "true";

        if (!hasShownWelcome || forceShow) {
            // Give it a tiny moment to ensure hydration is stable
            const showTimer = setTimeout(() => {
                setIsVisible(true);
            }, 50);

            if (!forceShow) {
                sessionStorage.setItem("hasShownWelcome", "true");
            }

            // Auto-hide after 4.5 seconds to make it more noticeable
            const hideTimer = setTimeout(() => {
                setIsVisible(false);
            }, 4500);

            return () => {
                clearTimeout(showTimer);
                clearTimeout(hideTimer);
            };
        }
    }, []);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8 }}
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#09090b] text-white"
                >
                    <div className="relative flex flex-col items-center text-center">
                        {/* Background subtle glow */}
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1.2, opacity: 0.15 }}
                            transition={{ 
                                duration: 2, 
                                repeat: Infinity, 
                                repeatType: "reverse" 
                            }}
                            className="absolute -inset-10 bg-blue-500 rounded-full blur-[80px]"
                        />

                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
                            className="z-10"
                        >
                            <span className="text-sm font-bold tracking-[0.3em] text-blue-500 uppercase mb-4 block">
                                Portal Access Granted
                            </span>
                            
                            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-2">
                                Welcome back,
                            </h1>
                            
                            <motion.h2 
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
                                className="text-3xl md:text-5xl font-extrabold bg-gradient-to-r from-white via-blue-100 to-blue-400 bg-clip-text text-transparent"
                            >
                                {user.full_name}
                            </motion.h2>
                        </motion.div>

                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: "100%" }}
                            transition={{ delay: 0.8, duration: 1.5, ease: "easeInOut" }}
                            className="h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent mt-8 w-64"
                        />
                        
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 1.2, duration: 0.5 }}
                            className="text-gray-500 text-xs mt-4 font-medium tracking-widest uppercase"
                        >
                            Initializing Dashboard...
                        </motion.p>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
