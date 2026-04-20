"use client";

import { motion } from "framer-motion";

interface ProfitabilityGaugeProps {
    winRate?: number;
    wonCount?: number;
    lostCount?: number;
    avgHolding?: string;
    stats?: any;
}

export default function ProfitabilityGauge({ 
    winRate = 65, 
    wonCount = 20, 
    lostCount = 20, 
    avgHolding = "0M",
    stats
}: ProfitabilityGaugeProps) {
    const displayWonCount = wonCount;
    const displayLostCount = lostCount;
    const displayWinRate = winRate;
    const displayNetProfit = 1330; 

    return (
        <div className="flex flex-col h-full min-h-[300px] bg-[#06000a] border-[0.5px] border-[#e5e5e580] rounded-3xl p-6 relative overflow-hidden group">
            {/* Header */}
            <div className="flex items-start justify-between relative z-20 w-full mb-[16px]">
                <h3 className="text-[#e5e5e5] text-[18px] font-semibold tracking-[-0.6px]">
                    Profitability
                </h3>
                <div className="bg-[#1a1a1a] px-[10px] py-[4px] rounded-[5px] border border-white/5">
                    <span className="text-[#808080] text-[10px] font-semibold tracking-[-0.2px] uppercase">Avg Holding: {avgHolding}</span>
                </div>
            </div>

            <div className="flex-1 flex flex-col md:flex-row items-center justify-between gap-4 relative z-10 px-4">
                {/* Left Stat: Won */}
                <div className="flex flex-col gap-1">
                    <span className="text-[#808080] text-[13px] font-medium">Won</span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-[#e5e5e5] text-[18px] font-bold">{wonCount}</span>
                        <span className="text-[#808080] text-[11px]">trades</span>
                    </div>
                    <span className="text-[#04d97c] text-[20px] font-bold tracking-tight">+${stats?.profitability?.wonAmount || "2,450"}</span>
                </div>

                {/* Center Gauge Area */}
                <div className="flex flex-col items-center relative py-2">
                    <div className="relative w-[180px] h-[90px] mb-4">
                        <svg className="w-full h-full" viewBox="0 0 100 50">
                            <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#1a1a1a" strokeWidth="6" strokeLinecap="round" />
                            <motion.path 
                                d="M 10 50 A 40 40 0 0 1 90 50" 
                                fill="none" 
                                stroke="#04d97c" 
                                strokeWidth="6" 
                                strokeLinecap="round"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: winRate / 100 }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                            />
                        </svg>

                        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
                            <span className="text-white text-[24px] font-bold leading-none">{Math.round(winRate)}%</span>
                            <span className="text-[#808080] text-[10px] font-medium tracking-tight">Win Rate</span>
                        </div>
                    </div>

                    {/* Net Profit Box */}
                    <div className="bg-[#0c0c0c] border border-white/5 rounded-[12px] py-1 px-6 flex flex-col items-center shadow-lg relative">
                        <div className="absolute -left-6 top-1/2 -translate-y-1/2 text-[#808080] text-[9px] font-medium">0%</div>
                        <span className="text-white text-[18px] font-bold tracking-tight">+{displayNetProfit}</span>
                        <span className="text-[#808080] text-[9px] font-bold uppercase tracking-widest leading-none">Net Profit</span>
                        <div className="absolute -right-8 top-1/2 -translate-y-1/2 text-[#808080] text-[9px] font-medium">100%</div>
                    </div>
                </div>

                {/* Right Stat: Lost */}
                <div className="flex flex-col gap-1 items-end text-right">
                    <span className="text-[#808080] text-[13px] font-medium">Lost</span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-[#e5e5e5] text-[18px] font-bold">{displayLostCount}</span>
                        <span className="text-[#808080] text-[11px]">trades</span>
                    </div>
                    <span className="text-[#ff5666] text-[20px] font-bold tracking-tight">-${stats?.profitability?.lostAmount || "2,450"}</span>
                </div>
            </div>

            {/* Background Glow */}
            <div className="absolute bottom-[-40px] left-1/2 -translate-x-1/2 w-[150px] h-[150px] bg-[#04d97c05] rounded-full blur-[40px] pointer-events-none" />
        </div>
    );
}
