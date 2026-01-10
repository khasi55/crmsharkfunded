"use client";

import { motion } from "framer-motion";
import { Award, Star } from "lucide-react";

export default function LevelBadge() {
    return (
        <div className="relative h-full w-full flex items-center justify-between p-8 overflow-hidden group bg-[#121826]/30 rounded-2xl border border-white/5">
            {/* Background Image / Gradient */}
            <div className="absolute inset-0 z-0">
                {/* mesh gradient */}
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-bl from-[#7c2d12]/20 via-[#451a03]/10 to-transparent blur-[80px]" />
                <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-gradient-to-tr from-[#7c2d12]/10 to-transparent blur-[60px]" />
                {/* Radial highlights */}
                <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-amber-500/5 rounded-full blur-[100px]" />
            </div>

            {/* Left Content */}
            <div className="relative z-10 flex flex-col justify-center h-full gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-bold uppercase tracking-wider">
                            Current Tier
                        </div>
                    </div>
                    <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-amber-100 via-amber-400 to-amber-600 tracking-tight drop-shadow-sm">
                        Bronze
                    </h2>
                </div>

                <div className="flex gap-8 mt-2">
                    <div className="flex flex-col">
                        <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider mb-1">Total Reward</p>
                        <p className="text-2xl font-bold text-white tracking-tight">$0.00</p>
                    </div>
                    <div className="w-[1px] h-full bg-white/10" />
                    <div className="flex flex-col">
                        <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider mb-1">Highest Reward</p>
                        <p className="text-2xl font-bold text-white tracking-tight">$0.00</p>
                    </div>
                    <div className="w-[1px] h-full bg-white/10" />
                    <div className="flex flex-col">
                        <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider mb-1">Count</p>
                        <p className="text-2xl font-bold text-white tracking-tight">0</p>
                    </div>
                </div>
            </div>

            {/* Right Badge Graphic */}
            <div className="relative z-10 w-[240px] h-full flex items-center justify-center">
                {/* Glowing Orb behind badge */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] bg-amber-600/10 rounded-full blur-[50px]" />

                {/* Badge Icon */}
                <motion.div
                    initial={{ scale: 0.9, rotate: -5 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{
                        type: "spring",
                        stiffness: 50,
                        damping: 10,
                        repeat: Infinity,
                        repeatType: "reverse",
                        duration: 4
                    }}
                    className="relative"
                >
                    {/* Glass Card for Badge */}
                    <div className="w-36 h-48 bg-gradient-to-br from-white/10 to-transparent backdrop-blur-md rounded-2xl flex items-center justify-center shadow-2xl border border-white/10 relative overflow-hidden group-hover:border-amber-500/30 transition-colors duration-500">
                        {/* Internal shimmer */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent skew-x-12 translate-x-[-150%] animate-shimmer" />

                        <Award className="w-20 h-20 text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.6)]" strokeWidth={1.5} />
                    </div>

                    {/* Floating Particles */}
                    <motion.div
                        animate={{ y: [-8, 8, -8], x: [2, -2, 2], opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute -top-6 -right-6"
                    >
                        <Star className="w-8 h-8 text-amber-200 fill-amber-200 blur-[1px]" />
                    </motion.div>
                    <motion.div
                        animate={{ y: [6, -6, 6], x: [-3, 3, -3], opacity: [0.3, 0.8, 0.3] }}
                        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                        className="absolute bottom-4 -left-8"
                    >
                        <Star className="w-5 h-5 text-amber-600 fill-amber-600 blur-[0.5px]" />
                    </motion.div>
                </motion.div>
            </div>
        </div>
    );
}
