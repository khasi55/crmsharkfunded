"use client";

import { motion } from "framer-motion";
import { Clock } from "lucide-react";

interface SessionData {
    name: string;
    winRate: number;
    trades?: number;
}

interface SessionStatsProps {
    sessions?: SessionData[];
}

export default function SessionStats({ sessions }: SessionStatsProps) {
    const defaultSessions: SessionData[] = [
        { name: "New York", winRate: 68, trades: 12 },
        { name: "London", winRate: 54, trades: 8 },
        { name: "Asia", winRate: 44, trades: 4 },
    ];

    const displaySessions = sessions && sessions.length > 0 ? sessions : defaultSessions;
    const totalTrades = displaySessions.reduce((acc, s) => acc + (s.trades || 0), 24);

    return (
        <div className="bg-[#06000a] border-[0.5px] border-[#e5e5e580] rounded-3xl p-6 h-full min-h-[300px] flex flex-col relative overflow-hidden group">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 relative z-20">
                <h3 className="text-[#e5e5e5] text-[18px] font-semibold tracking-[-0.6px]">
                    Session Win Rates
                </h3>
                <div className="bg-[#1a1a1a] px-[10px] py-[4px] rounded-[5px] border border-white/5">
                    <span className="text-[#808080] text-[10px] font-semibold tracking-[-0.2px]">Trades: {totalTrades}</span>
                </div>
            </div>

            <div className="flex-1 flex flex-col gap-[14px] relative z-20 justify-center">
                {displaySessions.map((session, i) => (
                    <div key={session.name} className="flex flex-col gap-[8px]">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-[12px]">
                                <div className="flex items-center gap-[6px]">
                                    <Clock className="w-[16px] h-[16px] text-[#e5e5e5] opacity-80" />
                                    <span className="text-[#e5e5e5] text-[14px] font-semibold tracking-[-0.7px]">
                                        {session.name}
                                    </span>
                                </div>
                                {i === 0 && (
                                    <div className="bg-gradient-to-r from-[#CB72F3] to-[#76428D] border-[0.4px] border-white/50 px-[8px] py-[4px] rounded-[2px] shadow-lg">
                                        <span className="text-white text-[8px] font-semibold uppercase tracking-wider">Best</span>
                                    </div>
                                )}
                            </div>
                            <span className="text-[#e5e5e5] text-[16px] font-semibold tracking-[-0.8px]">
                                {session.winRate}%
                            </span>
                        </div>

                        {/* High-Fidelity Loading Bar Container */}
                        <div className="relative w-full h-[8px] bg-[#1a1a1a] rounded-[110px] overflow-hidden">
                            {/* Background Track with Gradient (simulated) */}
                            <div className="absolute inset-0 bg-gradient-to-r from-[#989898]/20 to-[#1a1a1a] rounded-full" />
                            
                            {/* Main Progress Bar with Glow */}
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${session.winRate}%` }}
                                transition={{ duration: 1, delay: i * 0.1 }}
                                className="h-full bg-gradient-to-r from-[#4e2671] to-[#a044f2] rounded-full relative shadow-[0_0_15px_rgba(160,68,242,0.4)]"
                            >
                                {/* Inner Screen Reflective Blur layer */}
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent mix-blend-screen opacity-50 blur-[2px]" />
                            </motion.div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Background decorative glows matching Figma Ellipse IDs */}
            <div className="absolute top-[246px] left-[315px] w-[202px] h-[211px] bg-[#CB72F315] rounded-full blur-[60px] pointer-events-none mix-blend-plus-lighter z-0" />
            <div className="absolute top-[141px] left-[383px] w-[489px] h-[511px] bg-[#CB72F308] rounded-full blur-[80px] pointer-events-none mix-blend-plus-lighter z-0" />
        </div>
    );
}
