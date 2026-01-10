"use client";

import { motion } from "framer-motion";

interface ProfitabilityGaugeProps {
    winRate?: number;
    tradesTaken?: number;
    wonPct?: number;
    lostPct?: number;
    wonCount?: number;
    lostCount?: number;
    avgHolding?: string;
}

export default function ProfitabilityGauge({
    winRate = 0,
    tradesTaken = 0,
    wonPct = 0,
    lostPct = 0,
    wonCount = 0,
    lostCount = 0,
    avgHolding = "0m"
}: ProfitabilityGaugeProps) {
    // Default to demo data if zeros
    const displayTrades = tradesTaken;
    const displayWonPct = wonPct ? Number(wonPct.toFixed(1)) : 0;
    const displayLostPct = lostPct ? Number(lostPct.toFixed(1)) : 0;
    const displayWonCount = wonCount;
    const displayLostCount = lostCount;
    const displayWinRate = winRate ? Number(winRate.toFixed(1)) : 0;
    const avgHoldingPeriod = avgHolding || "0m";

    // Colors from reference: Red Left, Green Right? Or Green Left, Red Right?
    // Reference Image: Inner Left is Red, Inner Right is Green.
    const colors = { left: "#ef4444", right: "#22c55e" };

    return (
        <div className="flex flex-col h-full justify-between pb-2 bg-[#121826]/30 rounded-2xl border border-white/5">
            <div className="flex justify-between items-start relative z-10 mb-4 px-2">
                <h3 className="text-white font-medium text-lg">Profitability</h3>
                <div className="text-right flex flex-col items-end">
                    <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider bg-white/5 px-2 py-0.5 rounded-md mb-0.5">Avg Holding</span>
                    <span className="text-white font-bold text-sm">{avgHoldingPeriod}</span>
                </div>
            </div>

            <div className="flex items-center justify-between mt-2 px-4 pb-4">
                {/* Left Stats */}
                <div className="text-left flex flex-col gap-1">
                    <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Won</p>
                    <div className="flex items-baseline gap-1">
                        <p className="text-2xl font-bold text-green-400">{displayWonPct}%</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        <p className="text-gray-400 text-xs font-medium">{displayWonCount} Trades</p>
                    </div>
                </div>

                {/* Gauge */}
                <div className="relative w-[200px] h-[100px] flex items-end justify-center -mb-4">
                    <svg width="200" height="100" viewBox="0 0 200 100" className="overflow-visible">
                        {/* Glow Filter */}
                        <defs>
                            <filter id="glow-green" x="-50%" y="-50%" width="200%" height="200%">
                                <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                                <feMerge>
                                    <feMergeNode in="coloredBlur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                        </defs>

                        {/* Track Background */}
                        <path d="M 20 90 A 80 80 0 0 1 180 90" fill="none" stroke="#1e293b" strokeWidth="8" strokeLinecap="round" opacity="0.5" />

                        {/* Data Segments */}
                        {(() => {
                            const r = 80;
                            const cx = 100;
                            const cy = 90;

                            const splitAngle = Math.PI - (displayWonPct / 100) * Math.PI;
                            const splitX = cx + r * Math.cos(splitAngle);
                            const splitY = cy - r * Math.sin(splitAngle);

                            // Adjust start/end points for wider arc
                            const startX = 20;
                            // const startY = 90;
                            const endX = 180;
                            // const endY = 90;

                            return (
                                <>
                                    {/* Left Arc (Wins, Green) */}
                                    <motion.path
                                        d={`M ${startX} 90 A ${r} ${r} 0 0 1 ${splitX} ${splitY}`}
                                        fill="none"
                                        stroke={colors.right} // Green
                                        strokeWidth="10"
                                        strokeLinecap="round"
                                        initial={{ pathLength: 0 }}
                                        animate={{ pathLength: 1 }}
                                        transition={{ duration: 1, ease: "easeOut" }}
                                        filter="url(#glow-green)"
                                    />
                                    {/* Right Arc (Losses, Red) */}
                                    <motion.path
                                        d={`M ${splitX} ${splitY} A ${r} ${r} 0 0 1 ${endX} 90`}
                                        fill="none"
                                        stroke={colors.left} // Red
                                        strokeWidth="8"
                                        strokeLinecap="round"
                                        initial={{ pathLength: 0 }}
                                        animate={{ pathLength: 1 }}
                                        transition={{ duration: 1, ease: "easeOut", delay: 0.5 }}
                                        opacity="0.8"
                                    />
                                </>
                            );
                        })()}
                    </svg>

                    {/* Center Text */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center">
                        <p className="text-gray-500 text-[9px] font-bold uppercase tracking-widest mb-1">Win Rate</p>
                        <p className="text-3xl font-black text-white tracking-tight">{displayWinRate}%</p>
                        <p className="text-[#64748b] text-[10px] font-medium mt-1 bg-[#1e293b] px-2 py-0.5 rounded-full">{displayTrades} Trades</p>
                    </div>
                </div>

                {/* Right Stats */}
                <div className="text-right flex flex-col gap-1">
                    <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Lost</p>
                    <div className="flex items-baseline justify-end gap-1">
                        <p className="text-2xl font-bold text-red-400">{displayLostPct}%</p>
                    </div>
                    <div className="flex items-center justify-end gap-1.5">
                        <p className="text-gray-400 text-xs font-medium">{displayLostCount} Trades</p>
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    </div>
                </div>
            </div>
        </div>
    );
}
